from __future__ import annotations

import pandas as pd
import matplotlib.pyplot as plt

from environment import MiniMarket


def run_scenario(has_illegal_parking: bool, seed: int = 42):
    model = MiniMarket(
        num_customers=200,
        days=60,

        # Geography
        market_radius=500.0,
        distance_to_B=500.0,

        # Store attributes
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

        # Memory and bad experience
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
    choices = model.get_choice_records()

    return model, results, choices


def print_summary(name: str, results: pd.DataFrame) -> None:
    visits_a = int(results["Visits A"].sum())
    visits_b = int(results["Visits B"].sum())

    revenue_a = int(results["Revenue A"].sum())
    revenue_b = int(results["Revenue B"].sum())

    total_visits = visits_a + visits_b
    share_a = visits_a / max(1, total_visits)
    share_b = visits_b / max(1, total_visits)

    print(f"\n=== {name} ===")
    print(f"Total Visits A      : {visits_a}")
    print(f"Total Visits B      : {visits_b}")
    print(f"Share Visits A      : {share_a:.3f}")
    print(f"Share Visits B      : {share_b:.3f}")
    print(f"Total Revenue A     : Rp{revenue_a:,}")
    print(f"Total Revenue B     : Rp{revenue_b:,}")
    print(f"Bad Experiences     : {int(results['Bad Experiences'].sum())}")
    print(f"WOM Messages        : {int(results['WOM Messages'].sum())}")
    print(f"Final Avg Risk A    : {results['Avg Risk A'].iloc[-1]:.3f}")


def plot_daily_visits(results_with: pd.DataFrame, results_without: pd.DataFrame) -> None:
    days = results_with.index + 1

    plt.figure(figsize=(10, 5))

    plt.plot(days, results_with["Visits A"], label="A - dengan tukang parkir")
    plt.plot(days, results_with["Visits B"], label="B - skenario A ada tukang parkir")

    plt.plot(days, results_without["Visits A"], linestyle="--", label="A - tanpa tukang parkir")
    plt.plot(days, results_without["Visits B"], linestyle="--", label="B - skenario A tanpa tukang parkir")

    plt.title("Perbandingan Kunjungan Harian")
    plt.xlabel("Hari")
    plt.ylabel("Jumlah Kunjungan")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.show()


def plot_cumulative_revenue(results_with: pd.DataFrame, results_without: pd.DataFrame) -> None:
    days = results_with.index + 1

    revenue_a_with = results_with["Revenue A"].cumsum()
    revenue_b_with = results_with["Revenue B"].cumsum()

    revenue_a_without = results_without["Revenue A"].cumsum()
    revenue_b_without = results_without["Revenue B"].cumsum()

    plt.figure(figsize=(10, 5))

    plt.plot(days, revenue_a_with, label="Revenue A - dengan tukang parkir")
    plt.plot(days, revenue_b_with, label="Revenue B - skenario A ada tukang parkir")

    plt.plot(days, revenue_a_without, linestyle="--", label="Revenue A - tanpa tukang parkir")
    plt.plot(days, revenue_b_without, linestyle="--", label="Revenue B - skenario A tanpa tukang parkir")

    plt.title("Perbandingan Revenue Kumulatif")
    plt.xlabel("Hari")
    plt.ylabel("Revenue Kumulatif")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.show()


def plot_risk_and_wom(results_with: pd.DataFrame) -> None:
    days = results_with.index + 1

    plt.figure(figsize=(10, 5))

    plt.plot(days, results_with["Avg Risk A"], label="Avg Risk A")
    plt.plot(days, results_with["Bad Experiences"], label="Bad Experiences")
    plt.plot(days, results_with["WOM Messages"], label="WOM Messages")

    plt.title("Dinamika Risiko, Pengalaman Buruk, dan WOM")
    plt.xlabel("Hari")
    plt.ylabel("Nilai / Jumlah")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.show()


def plot_customer_map(model: MiniMarket, title: str) -> None:
    x_values = [customer.x for customer in model.customers]
    y_values = [customer.y for customer in model.customers]

    colors = []
    sizes = []

    for customer in model.customers:
        if customer.choice == "A":
            colors.append("red")
        elif customer.choice == "B":
            colors.append("green")
        else:
            colors.append("gray")

        sizes.append(20 + 80 * customer.perceived_risk_a)

    plt.figure(figsize=(8, 6))

    plt.scatter(
        x_values,
        y_values,
        c=colors,
        s=sizes,
        alpha=0.7,
        edgecolors="black",
        linewidths=0.3,
    )

    plt.scatter(
        model.store_a.x,
        model.store_a.y,
        marker="s",
        s=200,
        c="red",
        edgecolors="black",
        label="Toko A",
    )

    plt.scatter(
        model.store_b.x,
        model.store_b.y,
        marker="s",
        s=200,
        c="green",
        edgecolors="black",
        label="Toko B",
    )

    plt.title(title)
    plt.xlabel("Koordinat X")
    plt.ylabel("Koordinat Y")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.show()


def main() -> None:
    model_with, results_with, choices_with = run_scenario(
        has_illegal_parking=True,
        seed=42,
    )

    model_without, results_without, choices_without = run_scenario(
        has_illegal_parking=False,
        seed=42,
    )

    print_summary("Skenario 1 - Toko A ada tukang parkir", results_with)
    print_summary("Skenario 2 - Toko A tanpa tukang parkir", results_without)

    print("\nContoh choice records dengan tukang parkir:")
    print(choices_with.head(10).to_string(index=False))

    results_with.to_csv("results_with_parking.csv")
    results_without.to_csv("results_without_parking.csv")
    choices_with.to_csv("choices_with_parking.csv", index=False)
    choices_without.to_csv("choices_without_parking.csv", index=False)

    plot_daily_visits(results_with, results_without)
    plot_cumulative_revenue(results_with, results_without)
    plot_risk_and_wom(results_with)
    plot_customer_map(
        model_with,
        "Sebaran Agen pada Hari Terakhir - Skenario Toko A Ada Tukang Parkir",
    )


if __name__ == "__main__":
    main()