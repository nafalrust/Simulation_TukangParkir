from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass

import mesa
import pandas as pd
from mesa.datacollection import DataCollector


MIN_PURCHASE_AMOUNT = 1_000
MAX_PURCHASE_AMOUNT = 200_000
BASE_BAD_EXPERIENCE_PROBABILITY = 0.10
MAX_BAD_EXPERIENCE_PROBABILITY = 0.80


@dataclass(frozen=True)
class Store:
    name: str
    x: float
    y: float
    has_illegal_parking: bool


class CustomerAgent(mesa.Agent):
    """
    Agent pelanggan dengan weighted scoring + softmax untuk pemilihan toko.

    Atribut:
        parking_aversion  : sensitivitas individu terhadap parkir liar [0, 1].
                            Meningkat dari pengalaman buruk (memory) dan WOM.
        perceived_risk_a  : persepsi risiko terhadap Toko A [0, 1].
                            Meluruh tiap hari (memory_decay), naik saat
                            pengalaman buruk langsung atau mendengar WOM.
    """

    def __init__(
        self,
        model: "MiniMarket",
        x: float,
        y: float,
        parking_aversion: float,
    ) -> None:
        super().__init__(model)
        self.x = x
        self.y = y
        self.purchase_amount = 0
        self.parking_aversion = parking_aversion
        self.perceived_risk_a = model.initial_risk_a

        self.choice: str | None = None
        self.had_bad_experience = False

    def step(self) -> None:
        self.choice = None
        self.had_bad_experience = False
        self.purchase_amount = 0

        # Persepsi risiko meluruh tiap hari
        self.perceived_risk_a *= 1.0 - self.model.memory_decay
        self.perceived_risk_a = max(0.0, self.perceived_risk_a)

        if self.random.random() > self.model.shopping_need_probability:
            return

        self.purchase_amount = self.random.randrange(
            MIN_PURCHASE_AMOUNT,
            MAX_PURCHASE_AMOUNT + 1,
            1_000,
        )

        distance_to_a = math.hypot(
            self.x - self.model.store_a.x,
            self.y - self.model.store_a.y,
        )
        distance_to_b = math.hypot(
            self.x - self.model.store_b.x,
            self.y - self.model.store_b.y,
        )

        # Jarak dalam meter, tidak dinormalisasi.
        # weight_distance (negatif kecil, e.g. -0.002) mengontrol
        # seberapa besar pengaruh jarak terhadap skor.
        # has_illegal_parking (0 atau 1) mengalikan semua efek negatif jukir.
        # Jika 0, suku aversion/fee/risk hilang dari skor → tidak ada dampak jukir.
        jp = self.model.has_illegal_parking
        parking_fee_score = (self.model.parking_fee / MAX_PURCHASE_AMOUNT) * jp

        score_a = (
            self.model.weight_distance * distance_to_a
            + self.model.weight_parking_aversion * self.parking_aversion * jp
            + self.model.weight_parking_fee * parking_fee_score
            + self.model.weight_risk * self.perceived_risk_a * jp
            + self.model.weight_attractiveness * self.model.attractiveness_A
        )

        score_b = (
            self.model.weight_distance * distance_to_b
            + self.model.weight_attractiveness * self.model.attractiveness_B
        )

        # Softmax: konversi skor ke probabilitas pilihan.
        # max_score dipakai untuk numerical stability.
        max_score = max(score_a, score_b)
        exp_a = math.exp(score_a - max_score)
        exp_b = math.exp(score_b - max_score)
        total_exp = exp_a + exp_b

        probability_a = exp_a / total_exp

        self.choice = "A" if self.random.random() < probability_a else "B"

        self.model.daily_visits[self.choice] += 1
        self.model.daily_revenue[self.choice] += self.purchase_amount

        if self.choice == "A" and jp:
            # Pengalaman buruk hanya terjadi jika ada jukir.
            bad_experience_probability = min(
                MAX_BAD_EXPERIENCE_PROBABILITY,
                BASE_BAD_EXPERIENCE_PROBABILITY
                + (self.parking_aversion * parking_fee_score),
            )

            if self.random.random() < bad_experience_probability:
                self.had_bad_experience = True
                self.parking_aversion = min(
                    1.0,
                    self.parking_aversion + self.model.memory_strength,
                )
                self.perceived_risk_a = min(
                    1.0,
                    self.perceived_risk_a + self.model.direct_experience_impact,
                )


class MiniMarket(mesa.Model):
    """
    ABM dua minimarket dengan weighted scoring + softmax untuk pilihan toko.

    Toko A memiliki parkir liar (ada parking_fee dan risiko pengalaman buruk).
    Toko B tidak memiliki parkir liar.

    Parameter yang bisa divariasikan untuk analisis sensitivitas:
        Toko             : parking_fee, attractiveness_A, attractiveness_B
        Geografi         : distance_to_B, market_radius
        Agent            : parking_aversion (distribusi awal), initial_risk_a
        Dinamika pribadi : memory_strength, memory_decay, direct_experience_impact
        Dinamika sosial  : wom_probability, wom_strength, num_contacts
        Bobot skor       : weight_distance, weight_parking_aversion,
                           weight_parking_fee, weight_risk, weight_attractiveness
    """

    def __init__(
        self,
        num_customers: int = 200,
        days: int = 60,
        market_radius: float = 500.0,
        has_illegal_parking: int = 1,
        parking_fee: int = 2_000,
        distance_to_B: float = 500.0,
        attractiveness_A: float = 0.5,
        attractiveness_B: float = 0.5,
        parking_aversion: float = 0.4,
        initial_risk_a: float = 0.05,
        memory_strength: float = 0.1,
        memory_decay: float = 0.03,
        direct_experience_impact: float = 0.35,
        wom_probability: float = 0.3,
        wom_strength: float = 0.05,
        num_contacts: int = 3,
        shopping_need_probability: float = 0.35,
        weight_distance: float = -0.002,
        weight_parking_aversion: float = -1.2,
        weight_parking_fee: float = -2.0,
        weight_risk: float = -1.0,
        weight_attractiveness: float = 1.0,
        seed: int = 42,
    ) -> None:
        super().__init__(rng=seed)
        self.random = random.Random(seed)

        self.days = days
        self.market_radius = market_radius
        self.has_illegal_parking = has_illegal_parking
        self.parking_fee = parking_fee
        self.distance_to_B = distance_to_B
        self.attractiveness_A = attractiveness_A
        self.attractiveness_B = attractiveness_B
        self.parking_aversion = parking_aversion
        self.initial_risk_a = initial_risk_a
        self.memory_strength = memory_strength
        self.memory_decay = memory_decay
        self.direct_experience_impact = direct_experience_impact
        self.wom_probability = wom_probability
        self.wom_strength = wom_strength
        self.num_contacts = num_contacts
        self.shopping_need_probability = shopping_need_probability
        self.weight_distance = weight_distance
        self.weight_parking_aversion = weight_parking_aversion
        self.weight_parking_fee = weight_parking_fee
        self.weight_risk = weight_risk
        self.weight_attractiveness = weight_attractiveness

        self.store_a = Store("A", 0.0, 0.0, has_illegal_parking=True)
        self.store_b = Store("B", distance_to_B, 0.0, has_illegal_parking=False)

        self.customers: list[CustomerAgent] = []
        for _ in range(num_customers):
            self.customers.append(
                CustomerAgent(
                    model=self,
                    x=self.random.uniform(-market_radius, distance_to_B + market_radius),
                    y=self.random.uniform(-market_radius, market_radius),
                    parking_aversion=min(
                        1.0,
                        max(0.0, self.random.uniform(parking_aversion - 0.2, parking_aversion + 0.2)),
                    ),
                )
            )

        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_bad_experiences = 0
        self.daily_wom_messages = 0

        self.datacollector = DataCollector(
            model_reporters={
                "Visits A": lambda model: model.daily_visits["A"],
                "Visits B": lambda model: model.daily_visits["B"],
                "Revenue A": lambda model: model.daily_revenue["A"],
                "Revenue B": lambda model: model.daily_revenue["B"],
                "Bad Experiences": "daily_bad_experiences",
                "WOM Messages": "daily_wom_messages",
                "Avg Risk A": lambda model: sum(
                    c.perceived_risk_a for c in model.customers
                ) / len(model.customers),
                "Avg Parking Aversion": lambda model: sum(
                    c.parking_aversion for c in model.customers
                ) / len(model.customers),
            }
        )

    def step(self) -> None:
        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_bad_experiences = 0
        self.daily_wom_messages = 0

        self.agents.shuffle_do("step")

        storytellers = [c for c in self.customers if c.had_bad_experience]
        self.daily_bad_experiences = len(storytellers)

        for storyteller in storytellers:
            if self.random.random() >= self.wom_probability:
                continue

            contacts = [c for c in self.customers if c is not storyteller]
            for listener in self.random.sample(contacts, min(self.num_contacts, len(contacts))):
                listener.parking_aversion = min(
                    1.0,
                    listener.parking_aversion + self.wom_strength,
                )
                listener.perceived_risk_a = min(
                    1.0,
                    listener.perceived_risk_a + self.wom_strength,
                )
                self.daily_wom_messages += 1

        self.datacollector.collect(self)

    def run(self) -> pd.DataFrame:
        for _ in range(self.days):
            self.step()
        results = self.datacollector.get_model_vars_dataframe()
        results.index.name = "Day"
        return results


def sensitivity_analysis(
    base_params: dict,
    param_name: str,
    values: list,
    days: int = 60,
    runs_per_value: int = 5,
) -> pd.DataFrame:
    """
    Jalankan simulasi untuk berbagai nilai satu parameter,
    sisanya tetap di base_params.

    Args:
        base_params    : dict parameter default model.
        param_name     : nama parameter yang divariasikan.
        values         : list nilai yang ingin diuji.
        days           : jumlah hari per run.
        runs_per_value : jumlah run per nilai (untuk rata-rata noise stokastik).

    Returns:
        DataFrame dengan kolom: param_name, param_value, dan semua metrik akhir.
    """
    records = []
    for val in values:
        for run in range(runs_per_value):
            params = {**base_params, param_name: val, "seed": run, "days": days}
            model = MiniMarket(**params)
            results = model.run()

            last = results.iloc[-1]
            records.append({
                "param_value": val,
                "run": run,
                "Visits A": results["Visits A"].sum(),
                "Visits B": results["Visits B"].sum(),
                "Revenue A": results["Revenue A"].sum(),
                "Revenue B": results["Revenue B"].sum(),
                "Share Visits A": results["Visits A"].sum() / max(
                    1, results["Visits A"].sum() + results["Visits B"].sum()
                ),
                "Total Bad Experiences": results["Bad Experiences"].sum(),
                "Total WOM Messages": results["WOM Messages"].sum(),
                "Final Avg Risk A": last["Avg Risk A"],
                "Final Avg Parking Aversion": last["Avg Parking Aversion"],
            })

    df = pd.DataFrame(records)
    summary = (
        df.groupby("param_value")
        .mean(numeric_only=True)
        .drop(columns=["run"])
        .reset_index()
    )
    summary.insert(0, "param_name", param_name)
    return summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="ABM dua minimarket — weighted scoring + softmax."
    )
    parser.add_argument("--customers", type=int, default=200)
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--market-radius", type=float, default=500.0)
    parser.add_argument("--parking-fee", type=int, default=2_000)
    parser.add_argument("--distance-to-B", type=float, default=500.0)
    parser.add_argument("--attractiveness-A", type=float, default=0.5)
    parser.add_argument("--attractiveness-B", type=float, default=0.5)
    parser.add_argument("--parking-aversion", type=float, default=0.4)
    parser.add_argument("--initial-risk-a", type=float, default=0.05)
    parser.add_argument("--memory-strength", type=float, default=0.1)
    parser.add_argument("--memory-decay", type=float, default=0.03)
    parser.add_argument("--direct-experience-impact", type=float, default=0.35)
    parser.add_argument("--wom-probability", type=float, default=0.3)
    parser.add_argument("--wom-strength", type=float, default=0.05)
    parser.add_argument("--num-contacts", type=int, default=3)
    parser.add_argument("--shopping-need-probability", type=float, default=0.35)
    parser.add_argument("--weight-distance", type=float, default=-0.002)
    parser.add_argument("--weight-parking-aversion", type=float, default=-1.2)
    parser.add_argument("--weight-parking-fee", type=float, default=-2.0)
    parser.add_argument("--weight-risk", type=float, default=-1.0)
    parser.add_argument("--weight-attractiveness", type=float, default=1.0)
    parser.add_argument(
        "--sensitivity",
        action="store_true",
        help="Jalankan analisis sensitivitas untuk semua parameter utama.",
    )
    return parser


BASE_PARAMS = {
    "num_customers": 200,
    "days": 60,
    "market_radius": 500.0,
    "parking_fee": 2_000,
    "distance_to_B": 500.0,
    "attractiveness_A": 0.5,
    "attractiveness_B": 0.5,
    "parking_aversion": 0.4,
    "initial_risk_a": 0.05,
    "memory_strength": 0.1,
    "memory_decay": 0.03,
    "direct_experience_impact": 0.35,
    "wom_probability": 0.3,
    "wom_strength": 0.05,
    "num_contacts": 3,
    "shopping_need_probability": 0.35,
    "weight_distance": -0.002,
    "weight_parking_aversion": -1.2,
    "weight_parking_fee": -2.0,
    "weight_risk": -1.0,
    "weight_attractiveness": 1.0,
}

SENSITIVITY_PARAMS = {
    "parking_aversion":        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    "initial_risk_a":          [0.0, 0.05, 0.1, 0.2, 0.5],
    "parking_fee":             [500, 1_000, 2_000, 5_000, 10_000, 20_000],
    "memory_strength":         [0.0, 0.05, 0.1, 0.2, 0.3],
    "memory_decay":            [0.0, 0.01, 0.03, 0.05, 0.1],
    "direct_experience_impact":[0.1, 0.2, 0.35, 0.5, 0.7],
    "wom_probability":         [0.0, 0.1, 0.3, 0.5, 0.7, 1.0],
    "wom_strength":            [0.01, 0.05, 0.1, 0.2],
    "num_contacts":            [1, 2, 3, 5, 10],
    "distance_to_B":           [200, 500, 1_000, 2_000],
    "attractiveness_A":        [0.2, 0.4, 0.5, 0.6, 0.8],
    "attractiveness_B":        [0.2, 0.4, 0.5, 0.6, 0.8],
    "weight_parking_aversion": [-0.5, -1.0, -1.2, -1.5, -2.0],
    "weight_parking_fee":      [-0.5, -1.0, -2.0, -3.0],
    "weight_risk":             [-0.5, -1.0, -1.5, -2.0],
    "weight_distance":         [-0.001, -0.002, -0.005, -0.01],
}


def main() -> None:
    args = build_parser().parse_args()

    if args.sensitivity:
        print("=== Analisis Sensitivitas ===\n")
        all_results = []
        for param, values in SENSITIVITY_PARAMS.items():
            print(f"  Memvariasikan: {param} ...")
            result = sensitivity_analysis(
                base_params=BASE_PARAMS,
                param_name=param,
                values=values,
                days=args.days,
                runs_per_value=5,
            )
            all_results.append(result)

        combined = pd.concat(all_results, ignore_index=True)
        print("\nHasil Sensitivitas (rata-rata 5 run):")
        print(combined.to_string(index=False))
        return

    model = MiniMarket(
        num_customers=args.customers,
        days=args.days,
        market_radius=args.market_radius,
        parking_fee=args.parking_fee,
        distance_to_B=args.distance_to_B,
        attractiveness_A=args.attractiveness_A,
        attractiveness_B=args.attractiveness_B,
        parking_aversion=args.parking_aversion,
        initial_risk_a=args.initial_risk_a,
        memory_strength=args.memory_strength,
        memory_decay=args.memory_decay,
        direct_experience_impact=args.direct_experience_impact,
        wom_probability=args.wom_probability,
        wom_strength=args.wom_strength,
        num_contacts=args.num_contacts,
        shopping_need_probability=args.shopping_need_probability,
        weight_distance=args.weight_distance,
        weight_parking_aversion=args.weight_parking_aversion,
        weight_parking_fee=args.weight_parking_fee,
        weight_risk=args.weight_risk,
        weight_attractiveness=args.weight_attractiveness,
        seed=args.seed,
    )
    results = model.run()

    print("\nHasil ABM harian (10 hari terakhir):")
    print(results.tail(10).to_string())
    print("\nTotal:")
    print(
        pd.Series(
            {
                "Visits A": int(results["Visits A"].sum()),
                "Visits B": int(results["Visits B"].sum()),
                "Share Visits A": round(
                    results["Visits A"].sum()
                    / max(1, results["Visits A"].sum() + results["Visits B"].sum()),
                    3,
                ),
                "Revenue A": int(results["Revenue A"].sum()),
                "Revenue B": int(results["Revenue B"].sum()),
                "Bad Experiences": int(results["Bad Experiences"].sum()),
                "WOM Messages": int(results["WOM Messages"].sum()),
                "Final Avg Risk A": round(float(results["Avg Risk A"].iloc[-1]), 3),
                "Final Avg Parking Aversion": round(
                    float(results["Avg Parking Aversion"].iloc[-1]), 3
                ),
            }
        ).to_string()
    )


if __name__ == "__main__":
    main()