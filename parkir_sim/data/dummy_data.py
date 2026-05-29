"""
data/dummy_data.py — Generator dummy data untuk prototyping

PANDUAN PENGUMPULAN DATA ASLI
==============================
Sebelum simulasi final, kumpulkan data berikut di lapangan.
Lokasi rekomendasi: Alfamart/Indomaret sekitar Jl. Kaliurang atau ring-1 UGM.

BLOK A — Data Kedatangan Kendaraan
  Apa   : Jumlah kendaraan yang masuk area parkir per 15 menit
  Format: [tanggal, jam_mulai, jam_selesai, jumlah_kendaraan, kondisi_jukir]
  Minimal: 3 hari observasi × 4 jam per sesi (pagi/siang/sore)
  Tools : tally counter / counter app HP

BLOK B — Data Durasi Parkir
  Apa   : Timestamp masuk & keluar per kendaraan
  Format: [id_kendaraan, jenis(motor/mobil), waktu_masuk, waktu_keluar, ada_jukir]
  Minimal: 50 observasi per kondisi (ada jukir / tidak ada jukir)

BLOK C — Data Balking (PALING PENTING)
  Apa   : Kendaraan yang mendekat tapi tidak jadi masuk
  Format: [jam, total_mendekat, total_masuk, total_pergi, kondisi_parkiran_%penuh]
  Tips  : Butuh 2 observer; posisi harus bisa lihat dari jalan

BLOK D — Data Spending
  Apa   : Nilai transaksi per pelanggan
  Format: [jam, jenis_kendaraan, nominal_belanja]
  Opsi  : Survei keluar toko (30–50 responden) atau minta data agregat kasir

BLOK E — Profil Tukang Parkir
  Apa   : Karakteristik operasional jukir di lokasi
  Format: narasi + [jam_mulai, jam_selesai, tarif_motor, tarif_mobil, tipe(resmi/liar)]
"""

import numpy as np
import pandas as pd
import os
import sys

# agar bisa import config dari parent folder
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    RANDOM_SEED, PARKING_DURATION_MEAN, PARKING_DURATION_STD,
    SPENDING_MEAN_MOTOR, SPENDING_STD_MOTOR,
    SPENDING_MEAN_MOBIL, SPENDING_STD_MOBIL,
    SPENDING_MIN, MOTOR_RATIO
)

rng = np.random.default_rng(RANDOM_SEED)


def generate_arrival_data(n_days: int = 3) -> pd.DataFrame:
    """
    Dummy data Blok A: kedatangan kendaraan per 15 menit.
    Ganti dengan data observasi lapangan setelah pengumpulan data.
    """
    records = []
    base_date = pd.Timestamp("2025-01-06")  # Senin

    for day in range(n_days):
        date = base_date + pd.Timedelta(days=day)
        is_weekend = date.weekday() >= 5
        weekend_mult = 1.35 if is_weekend else 1.0

        for hour in range(7, 21):
            # lambda per jam (non-homogeneous Poisson)
            if   hour < 9:  lam = 8
            elif hour < 11: lam = 15
            elif hour < 13: lam = 22
            elif hour < 15: lam = 18
            elif hour < 17: lam = 20
            elif hour < 19: lam = 25
            else:           lam = 8

            lam *= weekend_mult

            for quarter in range(4):  # 4 interval per jam (15 menit)
                minute = quarter * 15
                n_vehicles = rng.poisson(lam / 4)  # lam per 15 menit
                records.append({
                    "tanggal": date.strftime("%Y-%m-%d"),
                    "hari": date.strftime("%A"),
                    "jam": hour,
                    "menit_mulai": minute,
                    "interval": f"{hour:02d}:{minute:02d}",
                    "jumlah_kendaraan": n_vehicles,
                    "is_weekend": is_weekend,
                    # NOTE: isi kolom ini dari observasi — ada/tidak ada jukir saat itu
                    "ada_jukir": hour >= 8 and hour < 20,
                    "catatan": "DUMMY - ganti dengan data observasi"
                })

    return pd.DataFrame(records)


def generate_parking_duration_data(n_samples: int = 150) -> pd.DataFrame:
    """
    Dummy data Blok B: durasi parkir per kendaraan.
    Distribusi Lognormal — sesuaikan mu/sigma dari data asli.
    """
    jenis = rng.choice(["motor", "mobil"], size=n_samples,
                       p=[MOTOR_RATIO, 1 - MOTOR_RATIO])

    # Lognormal: derive mu & sigma dari mean & std yang diinginkan
    mean, std = PARKING_DURATION_MEAN, PARKING_DURATION_STD
    sigma2 = np.log(1 + (std / mean) ** 2)
    mu = np.log(mean) - sigma2 / 2
    sigma = np.sqrt(sigma2)

    durasi = rng.lognormal(mu, sigma, n_samples)
    durasi = np.clip(durasi, 2, 90)

    # Simulasikan ada_jukir berdasarkan jam
    jam_masuk = rng.integers(7, 21, n_samples)

    records = []
    for i in range(n_samples):
        records.append({
            "id_kendaraan": f"VH{i+1:04d}",
            "jenis": jenis[i],
            "jam_masuk": jam_masuk[i],
            "durasi_menit": round(durasi[i], 1),
            "ada_jukir": 8 <= jam_masuk[i] < 20,
            "catatan": "DUMMY - ganti dengan observasi timestamp masuk/keluar"
        })

    return pd.DataFrame(records)


def generate_balking_data(n_sessions: int = 12) -> pd.DataFrame:
    """
    Dummy data Blok C: perilaku balking.
    Data ini PALING KRITIS untuk validasi parameter p_balk.
    """
    records = []
    for session in range(n_sessions):
        hour = rng.integers(7, 21)
        ada_jukir = 8 <= hour < 20
        occupancy_pct = rng.uniform(0.3, 1.0)

        # Model sederhana: balk lebih tinggi dengan jukir atau saat penuh
        if ada_jukir:
            p_balk_true = 0.08 + 0.25 * occupancy_pct
        else:
            p_balk_true = 0.03 + 0.12 * occupancy_pct

        total_mendekat = rng.integers(15, 45)
        total_balk = rng.binomial(total_mendekat, p_balk_true)
        total_masuk = total_mendekat - total_balk

        records.append({
            "sesi": session + 1,
            "jam": hour,
            "ada_jukir": ada_jukir,
            "okupansi_pct": round(occupancy_pct * 100, 1),
            "total_mendekat": int(total_mendekat),
            "total_masuk": int(total_masuk),
            "total_balk": int(total_balk),
            "p_balk_observasi": round(total_balk / total_mendekat, 3),
            "catatan": "DUMMY - ganti dengan observasi langsung"
        })

    return pd.DataFrame(records)


def generate_spending_data(n_samples: int = 100) -> pd.DataFrame:
    """
    Dummy data Blok D: spending per kunjungan.
    Ganti dengan data survei keluar toko atau data kasir.
    """
    records = []
    for i in range(n_samples):
        jenis = rng.choice(["motor", "mobil"], p=[MOTOR_RATIO, 1 - MOTOR_RATIO])
        if jenis == "motor":
            spending = rng.normal(SPENDING_MEAN_MOTOR, SPENDING_STD_MOTOR)
        else:
            spending = rng.normal(SPENDING_MEAN_MOBIL, SPENDING_STD_MOBIL)

        spending = max(SPENDING_MIN, spending)
        spending = round(spending / 1000) * 1000  # bulatkan ke ribuan

        records.append({
            "id_responden": f"R{i+1:04d}",
            "jenis_kendaraan": jenis,
            "spending_rp": int(spending),
            "catatan": "DUMMY - ganti dengan survei/data kasir"
        })

    return pd.DataFrame(records)


def generate_all_and_save(output_dir: str = "data") -> dict[str, pd.DataFrame]:
    """Generate semua dummy dataset dan simpan ke CSV."""
    os.makedirs(output_dir, exist_ok=True)

    datasets = {
        "arrival":  generate_arrival_data(),
        "duration": generate_parking_duration_data(),
        "balking":  generate_balking_data(),
        "spending": generate_spending_data(),
    }

    for name, df in datasets.items():
        path = os.path.join(output_dir, f"dummy_{name}.csv")
        df.to_csv(path, index=False)
        print(f"✓ Saved {path} ({len(df)} rows)")

    return datasets


if __name__ == "__main__":
    datasets = generate_all_and_save()
    print("\nSummary:")
    for name, df in datasets.items():
        print(f"  {name:10s}: {df.shape[0]} baris × {df.shape[1]} kolom")
