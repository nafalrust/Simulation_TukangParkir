from __future__ import annotations

import pandas as pd

from agent import CustomerAgent, Store
from environment import MiniMarket


def print_summary(name: str, results: pd.DataFrame, choice_records: pd.DataFrame) -> None:
    total_visits_a = int(results["Visits A"].sum())
    total_visits_b = int(results["Visits B"].sum())

    total_revenue_a = int(results["Revenue A"].sum())
    total_revenue_b = int(results["Revenue B"].sum())

    total_visits = total_visits_a + total_visits_b
    share_a = total_visits_a / max(1, total_visits)
    share_b = total_visits_b / max(1, total_visits)

    print(f"\n=== {name} ===")
    print(f"Total Visits A      : {total_visits_a}")
    print(f"Total Visits B      : {total_visits_b}")
    print(f"Share Visits A      : {share_a:.3f}")
    print(f"Share Visits B      : {share_b:.3f}")
    print(f"Total Revenue A     : Rp{total_revenue_a:,}")
    print(f"Total Revenue B     : Rp{total_revenue_b:,}")
    print(f"Bad Experiences     : {int(results['Bad Experiences'].sum())}")
    print(f"WOM Messages        : {int(results['WOM Messages'].sum())}")
    print(f"Final Avg Risk A    : {results['Avg Risk A'].iloc[-1]:.3f}")

    print("\nContoh 10 choice records pertama:")
    print(choice_records.head(10).to_string(index=False))


def run_one_scenario(has_illegal_parking: bool, seed: int = 42):
    model = MiniMarket(
        num_customers=200,
        days=60,

        # Geography
        market_radius=500.0,
        distance_to_B=500.0,

        # Store condition
        has_illegal_parking=has_illegal_parking,
        parking_fee=2_000,
        attractiveness_A=0.5,
        attractiveness_B=0.5,

        # Purchase behavior
        min_purchase_amount=1_000,
        max_purchase_amount=500_000,
        purchase_amount_distribution=[
            (1_000, 20_000, 0.3),
            (21_000, 500_000, 0.7),
        ],
        shopping_proba=0.35,

        # Agent attributes
        parking_aversion=0.4,
        initial_risk_a=0.0,

        # Memory and experience
        memory_decay=0.03,
        direct_experience_impact=0.35,
        bad_experience_probability=0.5,

        # Word of mouth
        wom_probability=0.3,
        wom_strength=0.05,
        num_contacts=3,

        # Score weights
        weight_distance=-0.002,
        weight_parking_aversion=-1.2,
        weight_parking_fee=-2.0,
        weight_risk=-1.0,
        weight_attractiveness=1.0,

        seed=seed,
    )

    results = model.run()
    choice_records = model.get_choice_records()

    return results, choice_records


def main() -> None:
    # Scenario 1: Toko A ada tukang parkir
    results_with_parking, choices_with_parking = run_one_scenario(
        has_illegal_parking=True,
        seed=42,
    )

    # Scenario 2: Toko A tidak ada tukang parkir
    results_without_parking, choices_without_parking = run_one_scenario(
        has_illegal_parking=False,
        seed=42,
    )

    print_summary(
        "Skenario 1 - Toko A ada tukang parkir",
        results_with_parking,
        choices_with_parking,
    )

    print_summary(
        "Skenario 2 - Toko A tanpa tukang parkir",
        results_without_parking,
        choices_without_parking,
    )

    # Simpan hasil ke CSV
    results_with_parking.to_csv("results_with_parking.csv")
    results_without_parking.to_csv("results_without_parking.csv")

    choices_with_parking.to_csv("choices_with_parking.csv", index=False)
    choices_without_parking.to_csv("choices_without_parking.csv", index=False)

    print("\nFile hasil sudah disimpan:")
    print("- results_with_parking.csv")
    print("- results_without_parking.csv")
    print("- choices_with_parking.csv")
    print("- choices_without_parking.csv")


if __name__ == "__main__":
    main()