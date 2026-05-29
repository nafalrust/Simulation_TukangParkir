"""
simulation.py — Discrete Event Simulation engine menggunakan SimPy

Model: M(t)/G/1/K antrian dengan balking
  - M(t) : Non-homogeneous Poisson arrival
  - G    : General service time (Lognormal)
  - 1    : Single server (area parkir)
  - K    : Kapasitas terbatas (PARKING_CAPACITY)

Dua skenario:
  scenario="no_jukir"   → tanpa tukang parkir
  scenario="with_jukir" → dengan tukang parkir liar
"""

from __future__ import annotations
import simpy
import numpy as np
from dataclasses import dataclass, field
from typing import Literal

import config as cfg


# ─────────────────────────────────────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class VehicleEvent:
    """Satu record event kendaraan untuk logging."""
    vehicle_id: int
    vehicle_type: Literal["motor", "mobil"]
    sim_time: float          # menit simulasi
    event: Literal["arrive", "park", "balk", "depart"]
    slot_id: int | None = None
    spending: float = 0.0
    duration: float = 0.0   # menit parkir


@dataclass
class SimStats:
    """Statistik akumulatif simulasi."""
    # Kedatangan
    total_arrivals: int = 0
    total_parked: int = 0
    total_balked: int = 0

    # Revenue
    store_revenue: float = 0.0      # Rp dari belanja pelanggan
    jukir_revenue: float = 0.0     # Rp dari tarif parkir (ke jukir)

    # Queue / utilization
    peak_occupancy: int = 0
    total_park_minutes: float = 0.0

    # Time series (untuk chart)
    ts_time: list = field(default_factory=list)          # menit simulasi
    ts_occupancy: list = field(default_factory=list)     # slot terisi
    ts_arrivals_cum: list = field(default_factory=list)
    ts_revenue_cum: list = field(default_factory=list)
    ts_balk_cum: list = field(default_factory=list)

    # Log per event
    events: list = field(default_factory=list)

    @property
    def occupancy_rate(self) -> float:
        if self.total_arrivals == 0:
            return 0.0
        return self.total_parked / self.total_arrivals

    @property
    def balk_rate(self) -> float:
        if self.total_arrivals == 0:
            return 0.0
        return self.total_balked / self.total_arrivals

    @property
    def avg_park_duration(self) -> float:
        if self.total_parked == 0:
            return 0.0
        return self.total_park_minutes / self.total_parked


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def get_arrival_rate(sim_minute: float) -> float:
    """
    Kembalikan λ (kendaraan/jam) berdasarkan jam simulasi.
    sim_minute = menit sejak jam 07:00.
    """
    current_hour = 7 + sim_minute / 60
    rate_hour = int(current_hour)

    # Cari rate yang berlaku
    applicable = [h for h in cfg.ARRIVAL_RATES if h <= rate_hour]
    if not applicable:
        return list(cfg.ARRIVAL_RATES.values())[0]
    return cfg.ARRIVAL_RATES[max(applicable)]


def sample_parking_duration(rng: np.random.Generator) -> float:
    """
    Sample durasi parkir dari distribusi Lognormal.
    Return dalam satuan menit.
    """
    mean = cfg.PARKING_DURATION_MEAN
    std  = cfg.PARKING_DURATION_STD
    sigma2 = np.log(1 + (std / mean) ** 2)
    mu     = np.log(mean) - sigma2 / 2
    sigma  = np.sqrt(sigma2)
    dur = rng.lognormal(mu, sigma)
    return float(np.clip(dur, cfg.PARKING_DURATION_MIN, cfg.PARKING_DURATION_MAX))


def sample_spending(vehicle_type: str, rng: np.random.Generator) -> float:
    """Sample nilai belanja per kunjungan dari distribusi Normal terpotong."""
    if vehicle_type == "motor":
        mean, std = cfg.SPENDING_MEAN_MOTOR, cfg.SPENDING_STD_MOTOR
    else:
        mean, std = cfg.SPENDING_MEAN_MOBIL, cfg.SPENDING_STD_MOBIL
    spending = rng.normal(mean, std)
    return float(max(cfg.SPENDING_MIN, spending))


def compute_balk_probability(
    occupancy: int,
    capacity: int,
    scenario: str,
    sim_minute: float,
) -> float:
    """
    Hitung probabilitas balking berdasarkan:
    - tingkat keterisian parkiran
    - skenario (ada/tidak ada jukir)
    - waktu (jam operasi jukir)
    """
    occ_ratio = occupancy / capacity

    if scenario == "no_jukir":
        threshold = cfg.BALK_THRESHOLD_NO_JUKIR
        if occ_ratio < threshold:
            return 0.0
        # Linear dari 0 → BALK_BASE saat penuh
        scaled = (occ_ratio - threshold) / (1 - threshold + 1e-9)
        return cfg.BALK_BASE_NO_JUKIR * scaled

    else:  # with_jukir
        current_hour = 7 + sim_minute / 60
        jukir_active = cfg.JUKIR_START_HOUR <= current_hour < cfg.JUKIR_END_HOUR

        if not jukir_active:
            # Di luar jam jukir, perilaku sama dengan no_jukir
            return compute_balk_probability(occupancy, capacity, "no_jukir", sim_minute)

        # Jukir aktif: balking lebih tinggi bahkan saat parkiran sepi
        base_extra = cfg.BALK_JUKIR_IDLE if occ_ratio < 0.30 else 0.0

        threshold = cfg.BALK_THRESHOLD_WITH_JUKIR
        if occ_ratio < threshold:
            return base_extra

        scaled = (occ_ratio - threshold) / (1 - threshold + 1e-9)
        return base_extra + cfg.BALK_BASE_WITH_JUKIR * scaled


# ─────────────────────────────────────────────────────────────────────────────
# SimPy Processes
# ─────────────────────────────────────────────────────────────────────────────

class ParkingSimulation:
    """
    Kontainer utama simulasi SimPy.
    Satu instance = satu run simulasi dengan skenario tertentu.
    """

    def __init__(
        self,
        scenario: Literal["no_jukir", "with_jukir"],
        seed: int | None = None,
        duration_hours: float | None = None,
        capacity: int | None = None,
        # Override parameter jika diperlukan (untuk sensitivity analysis)
        arrival_multiplier: float = 1.0,
        balk_multiplier: float = 1.0,
        spending_multiplier: float = 1.0,
    ):
        self.scenario = scenario
        self.seed = seed if seed is not None else cfg.RANDOM_SEED
        self.duration_minutes = (duration_hours or cfg.SIM_DURATION_HOURS) * 60
        self.capacity = capacity or cfg.PARKING_CAPACITY
        self.arrival_mult = arrival_multiplier
        self.balk_mult = balk_multiplier
        self.spending_mult = spending_multiplier

        # SimPy env
        self.env = simpy.Environment()
        self.parking_slots = simpy.Resource(self.env, capacity=self.capacity)

        # RNG
        self.rng = np.random.default_rng(self.seed)

        # State
        self.stats = SimStats()
        self.vehicle_counter = 0

        # Snapshot state untuk animasi (diperbarui tiap TIME_STEP)
        self.snapshot_queue: list[dict] = []  # list snapshot untuk animasi

    # ─── Proses Kendaraan ───────────────────────────────────────────────────

    def vehicle_process(self, vehicle_id: int, vehicle_type: str):
        """Lifecycle satu kendaraan: datang → (parkir atau balk) → pergi."""
        arrive_time = self.env.now
        self.stats.total_arrivals += 1

        current_occ = self.parking_slots.count
        p_balk = compute_balk_probability(
            current_occ, self.capacity, self.scenario, arrive_time
        ) * self.balk_mult
        p_balk = min(p_balk, 0.95)  # cap agar tidak selalu balk

        self.stats.events.append(VehicleEvent(
            vehicle_id=vehicle_id,
            vehicle_type=vehicle_type,
            sim_time=arrive_time,
            event="arrive",
        ))

        # Balking check
        if self.rng.random() < p_balk or current_occ >= self.capacity:
            self.stats.total_balked += 1
            self.stats.events.append(VehicleEvent(
                vehicle_id=vehicle_id,
                vehicle_type=vehicle_type,
                sim_time=arrive_time,
                event="balk",
            ))
            return  # Kendaraan pergi tanpa parkir

        # Ambil slot parkir
        with self.parking_slots.request() as req:
            yield req  # tunggu slot (seharusnya langsung dapat karena sudah cek)

            slot_id = self.parking_slots.count  # proxy slot ID
            park_time = self.env.now
            duration = sample_parking_duration(self.rng)
            spending = sample_spending(vehicle_type, self.rng) * self.spending_mult

            self.stats.total_parked += 1
            self.stats.total_park_minutes += duration
            self.stats.store_revenue += spending * cfg.STORE_MARGIN
            self.stats.peak_occupancy = max(
                self.stats.peak_occupancy, self.parking_slots.count
            )

            # Jukir revenue
            if self.scenario == "with_jukir":
                current_hour = 7 + park_time / 60
                if cfg.JUKIR_START_HOUR <= current_hour < cfg.JUKIR_END_HOUR:
                    tarif = (cfg.JUKIR_TARIF_MOTOR if vehicle_type == "motor"
                             else cfg.JUKIR_TARIF_MOBIL)
                    self.stats.jukir_revenue += tarif

            self.stats.events.append(VehicleEvent(
                vehicle_id=vehicle_id,
                vehicle_type=vehicle_type,
                sim_time=park_time,
                event="park",
                slot_id=slot_id,
                spending=spending,
                duration=duration,
            ))

            yield self.env.timeout(duration)  # durasi parkir (menit simulasi)

            self.stats.events.append(VehicleEvent(
                vehicle_id=vehicle_id,
                vehicle_type=vehicle_type,
                sim_time=self.env.now,
                event="depart",
                slot_id=slot_id,
            ))

    # ─── Arrival Generator ──────────────────────────────────────────────────

    def arrival_generator(self):
        """
        Non-homogeneous Poisson process: generate inter-arrival times
        berdasarkan λ yang berubah setiap jam.
        """
        while self.env.now < self.duration_minutes:
            lam_per_hour = get_arrival_rate(self.env.now) * self.arrival_mult
            lam_per_minute = lam_per_hour / 60

            # Inter-arrival time: Exponential(1/λ) dalam menit
            inter_arrival = self.rng.exponential(1 / lam_per_minute)
            yield self.env.timeout(inter_arrival)

            if self.env.now >= self.duration_minutes:
                break

            self.vehicle_counter += 1
            vtype = "motor" if self.rng.random() < cfg.MOTOR_RATIO else "mobil"
            self.env.process(self.vehicle_process(self.vehicle_counter, vtype))

    # ─── Snapshot Collector ─────────────────────────────────────────────────

    def snapshot_collector(self):
        """Rekam state sistem setiap TIME_STEP menit untuk animasi."""
        while self.env.now < self.duration_minutes:
            self.stats.ts_time.append(self.env.now)
            self.stats.ts_occupancy.append(self.parking_slots.count)
            self.stats.ts_arrivals_cum.append(self.stats.total_arrivals)
            self.stats.ts_revenue_cum.append(self.stats.store_revenue)
            self.stats.ts_balk_cum.append(self.stats.total_balked)

            # Simpan snapshot untuk animasi
            self.snapshot_queue.append({
                "time": self.env.now,
                "occupancy": self.parking_slots.count,
                "capacity": self.capacity,
                "arrivals": self.stats.total_arrivals,
                "balked": self.stats.total_balked,
                "revenue": self.stats.store_revenue,
                "scenario": self.scenario,
            })

            yield self.env.timeout(cfg.TIME_STEP_SECONDS / 60)  # konversi detik → menit

    # ─── Run ────────────────────────────────────────────────────────────────

    def run(self) -> SimStats:
        """Jalankan simulasi penuh. Return objek SimStats."""
        self.env.process(self.arrival_generator())
        self.env.process(self.snapshot_collector())
        self.env.run(until=self.duration_minutes)

        # Ambil snapshot terakhir
        self.stats.ts_time.append(self.env.now)
        self.stats.ts_occupancy.append(self.parking_slots.count)
        self.stats.ts_arrivals_cum.append(self.stats.total_arrivals)
        self.stats.ts_revenue_cum.append(self.stats.store_revenue)
        self.stats.ts_balk_cum.append(self.stats.total_balked)

        return self.stats


# ─────────────────────────────────────────────────────────────────────────────
# Convenience: Jalankan kedua skenario sekaligus
# ─────────────────────────────────────────────────────────────────────────────

def run_both_scenarios(
    seed: int | None = None,
    duration_hours: float | None = None,
    arrival_multiplier: float = 1.0,
    balk_multiplier: float = 1.0,
    spending_multiplier: float = 1.0,
) -> tuple[SimStats, SimStats]:
    """
    Jalankan simulasi untuk skenario no_jukir dan with_jukir.
    Gunakan seed yang sama agar perbandingan fair (same random stream).

    Returns: (stats_no_jukir, stats_with_jukir)
    """
    _seed = seed if seed is not None else cfg.RANDOM_SEED

    sim_no = ParkingSimulation(
        scenario="no_jukir",
        seed=_seed,
        duration_hours=duration_hours,
        arrival_multiplier=arrival_multiplier,
        balk_multiplier=balk_multiplier,
        spending_multiplier=spending_multiplier,
    )
    stats_no = sim_no.run()

    sim_jukir = ParkingSimulation(
        scenario="with_jukir",
        seed=_seed,
        duration_hours=duration_hours,
        arrival_multiplier=arrival_multiplier,
        balk_multiplier=balk_multiplier,
        spending_multiplier=spending_multiplier,
    )
    stats_jukir = sim_jukir.run()

    return stats_no, stats_jukir


# ─────────────────────────────────────────────────────────────────────────────
# Quick test CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🚗 Running parking simulation...\n")
    stats_no, stats_jukir = run_both_scenarios()

    for label, s in [("TANPA JUKIR", stats_no), ("DENGAN JUKIR", stats_jukir)]:
        print(f"{'─'*40}")
        print(f"  Skenario   : {label}")
        print(f"  Kedatangan : {s.total_arrivals} kendaraan")
        print(f"  Parkir     : {s.total_parked} ({s.occupancy_rate:.1%})")
        print(f"  Balk       : {s.total_balked} ({s.balk_rate:.1%})")
        print(f"  Revenue    : Rp {s.store_revenue:,.0f}")
        print(f"  Peak occ.  : {s.peak_occupancy} slot")
        print(f"  Avg dur.   : {s.avg_park_duration:.1f} menit")
        print()
