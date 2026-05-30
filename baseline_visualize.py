from __future__ import annotations

import argparse
import os

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button, Slider

from baseline import (
    MAX_PURCHASE_AMOUNT,
    MIN_PURCHASE_AMOUNT,
    BaselineMiniMarket,
    MARKET_RADIUS,
    SHOPPING_NEED_PROBABILITY,
)


class BaselineDashboard:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.day = 0
        self.running = False
        self.model = self.build_model(args.distance_to_B)

        self.fig = plt.figure(figsize=(14, 8))
        grid = self.fig.add_gridspec(2, 2, width_ratios=[1.3, 1.0], height_ratios=[1, 1])
        self.ax_map = self.fig.add_subplot(grid[:, 0])
        self.ax_visits = self.fig.add_subplot(grid[0, 1])
        self.ax_revenue = self.fig.add_subplot(grid[1, 1])
        self.ax_aversion = self.ax_revenue.twinx()

        self.fig.subplots_adjust(bottom=0.34, wspace=0.28, hspace=0.34)

        self.distance_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.24, 0.50, 0.03]),
            label="Distance to B",
            valmin=args.distance_min,
            valmax=args.distance_max,
            valinit=args.distance_to_B,
            valstep=args.distance_step,
        )
        self.attractiveness_a_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.19, 0.50, 0.03]),
            label="Attractiveness A",
            valmin=0.0,
            valmax=1.0,
            valinit=args.attractiveness_A,
            valstep=0.05,
        )
        self.attractiveness_b_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.14, 0.50, 0.03]),
            label="Attractiveness B",
            valmin=0.0,
            valmax=1.0,
            valinit=args.attractiveness_B,
            valstep=0.05,
        )
        self.wom_probability_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.09, 0.50, 0.03]),
            label="WOM Probability",
            valmin=0.0,
            valmax=1.0,
            valinit=args.wom_probability,
            valstep=0.05,
        )
        self.wom_strength_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.04, 0.50, 0.03]),
            label="WOM Strength",
            valmin=0.0,
            valmax=0.3,
            valinit=args.wom_strength,
            valstep=0.01,
        )
        self.reset_button = Button(self.fig.add_axes([0.74, 0.16, 0.08, 0.045]), "Reset")
        self.step_button = Button(self.fig.add_axes([0.83, 0.16, 0.07, 0.045]), "Step")
        self.run_button = Button(self.fig.add_axes([0.91, 0.16, 0.07, 0.045]), "Run")

        self.distance_slider.on_changed(self.on_distance_changed)
        self.attractiveness_a_slider.on_changed(self.on_parameter_changed)
        self.attractiveness_b_slider.on_changed(self.on_parameter_changed)
        self.wom_probability_slider.on_changed(self.on_parameter_changed)
        self.wom_strength_slider.on_changed(self.on_parameter_changed)
        self.reset_button.on_clicked(self.on_reset_clicked)
        self.step_button.on_clicked(self.on_step_clicked)
        self.run_button.on_clicked(self.on_run_clicked)

        self.animation = FuncAnimation(
            self.fig,
            self.on_animation_frame,
            interval=args.interval,
            cache_frame_data=False,
        )
        self.update_plots()

    def build_model(self, distance_to_B: float) -> BaselineMiniMarket:
        attractiveness_A = getattr(
            getattr(self, "attractiveness_a_slider", None),
            "val",
            self.args.attractiveness_A,
        )
        attractiveness_B = getattr(
            getattr(self, "attractiveness_b_slider", None),
            "val",
            self.args.attractiveness_B,
        )
        wom_probability = getattr(
            getattr(self, "wom_probability_slider", None),
            "val",
            self.args.wom_probability,
        )
        wom_strength = getattr(
            getattr(self, "wom_strength_slider", None),
            "val",
            self.args.wom_strength,
        )
        return BaselineMiniMarket(
            num_customers=self.args.customers,
            days=self.args.days,
            parking_fee=self.args.parking_fee,
            distance_to_B=distance_to_B,
            attractiveness_A=float(attractiveness_A),
            attractiveness_B=float(attractiveness_B),
            parking_aversion=self.args.parking_aversion,
            memory_strength=self.args.memory_strength,
            wom_probability=float(wom_probability),
            wom_strength=float(wom_strength),
            num_contacts=self.args.num_contacts,
            beta_distance=self.args.beta_distance,
            beta_parking=self.args.beta_parking,
            beta_fee_ratio=self.args.beta_fee_ratio,
            seed=self.args.seed,
        )

    def reset_model(self, distance_to_B: float | None = None) -> None:
        if distance_to_B is None:
            distance_to_B = self.distance_slider.val
        self.running = False
        self.run_button.label.set_text("Run")
        self.day = 0
        self.model = self.build_model(float(distance_to_B))
        self.update_plots()

    def step_once(self) -> None:
        if self.day >= self.args.days:
            self.running = False
            self.run_button.label.set_text("Run")
            return

        self.model.step()
        self.day += 1
        self.update_plots()

    def on_animation_frame(self, _frame: int) -> None:
        if self.running:
            self.step_once()

    def on_distance_changed(self, distance_to_B: float) -> None:
        self.reset_model(distance_to_B)

    def on_parameter_changed(self, _value: float) -> None:
        self.reset_model()

    def on_reset_clicked(self, _event) -> None:
        self.reset_model()

    def on_step_clicked(self, _event) -> None:
        self.running = False
        self.run_button.label.set_text("Run")
        self.step_once()

    def on_run_clicked(self, _event) -> None:
        self.running = not self.running
        self.run_button.label.set_text("Pause" if self.running else "Run")

    def update_plots(self) -> None:
        self.update_map()
        self.update_visits_plot()
        self.update_revenue_plot()
        self.fig.canvas.draw_idle()

    def update_map(self) -> None:
        self.ax_map.clear()

        x_values = [customer.x for customer in self.model.customers]
        y_values = [customer.y for customer in self.model.customers]
        colors = [self.customer_color(customer.choice) for customer in self.model.customers]
        sizes = [18 + 55 * customer.parking_aversion for customer in self.model.customers]
        edge_colors = [
            "#facc15" if customer.had_negative_experience else "#ffffff"
            for customer in self.model.customers
        ]

        self.ax_map.scatter(
            x_values,
            y_values,
            c=colors,
            s=sizes,
            alpha=0.82,
            edgecolors=edge_colors,
            linewidths=0.6,
        )
        self.ax_map.scatter(
            [self.model.store_a.x],
            [self.model.store_a.y],
            s=240,
            marker="s",
            c="#dc2626",
            edgecolors="#111827",
            linewidths=1.2,
            label="A: ada tukang parkir",
        )
        self.ax_map.scatter(
            [self.model.store_b.x],
            [self.model.store_b.y],
            s=240,
            marker="s",
            c="#059669",
            edgecolors="#111827",
            linewidths=1.2,
            label="B: alternatif",
        )

        x_min = -MARKET_RADIUS * 1.1
        x_max = max(MARKET_RADIUS, self.model.distance_to_B + MARKET_RADIUS) * 1.1
        y_limit = MARKET_RADIUS * 1.1

        self.ax_map.set_xlim(x_min, x_max)
        self.ax_map.set_ylim(-y_limit, y_limit)
        self.ax_map.set_aspect("equal", adjustable="box")
        self.ax_map.grid(True, alpha=0.22)
        self.ax_map.legend(loc="upper right")
        self.ax_map.set_title(
            f"Hari {self.day} | Distance to B = {self.model.distance_to_B:.0f} m "
            f"| Attr A={self.model.attractiveness_A:.2f}, B={self.model.attractiveness_B:.2f} "
            f"| WOM p={self.model.wom_probability:.2f}, strength={self.model.wom_strength:.2f}"
        )
        self.ax_map.set_xlabel("Koordinat x")
        self.ax_map.set_ylabel("Koordinat y")
        self.ax_map.text(
            0.02,
            0.02,
            "Titik: pelanggan | Merah: pilih A | Hijau: pilih B | Abu: tidak belanja\n"
            "Ukuran titik makin besar = parking_aversion makin tinggi\n"
            "Border kuning = pengalaman negatif hari ini",
            transform=self.ax_map.transAxes,
            fontsize=9,
            va="bottom",
            bbox={"boxstyle": "round,pad=0.35", "facecolor": "white", "alpha": 0.85},
        )

    @staticmethod
    def customer_color(choice: str | None) -> str:
        if choice == "A":
            return "#dc2626"
        if choice == "B":
            return "#059669"
        return "#9ca3af"

    def update_visits_plot(self) -> None:
        self.ax_visits.clear()
        history = self.model.datacollector.get_model_vars_dataframe()

        if not history.empty:
            days = history.index + 1
            self.ax_visits.plot(days, history["Visits A"], color="#dc2626", label="Visits A")
            self.ax_visits.plot(days, history["Visits B"], color="#059669", label="Visits B")
            self.ax_visits.bar(
                days,
                history["Negative Experiences"],
                color="#facc15",
                alpha=0.35,
                label="Negative Experiences",
            )
            self.ax_visits.plot(
                days,
                history["WOM Messages"],
                color="#7c3aed",
                linestyle=":",
                label="WOM Messages",
            )
            self.ax_visits.legend(loc="upper right")

        self.ax_visits.set_xlim(1, self.args.days)
        self.ax_visits.set_ylim(0, max(1, int(self.args.customers * 0.55)))
        self.ax_visits.set_title("Kunjungan Harian")
        self.ax_visits.set_xlabel("Hari")
        self.ax_visits.set_ylabel("Jumlah")
        self.ax_visits.grid(True, alpha=0.22)

    def update_revenue_plot(self) -> None:
        self.ax_revenue.clear()
        self.ax_aversion.clear()
        history = self.model.datacollector.get_model_vars_dataframe()

        if not history.empty:
            days = history.index + 1
            revenue_a = history["Revenue A"].cumsum() / 1_000_000
            revenue_b = history["Revenue B"].cumsum() / 1_000_000
            self.ax_revenue.plot(days, revenue_a, color="#dc2626", label="Revenue A")
            self.ax_revenue.plot(days, revenue_b, color="#059669", label="Revenue B")
            self.ax_revenue.legend(loc="upper left")

            self.ax_aversion.plot(
                days,
                history["Avg Parking Aversion"],
                color="#7c3aed",
                linestyle="--",
                label="Avg Parking Aversion",
            )
            self.ax_aversion.legend(loc="lower right")

        avg_purchase = (MIN_PURCHASE_AMOUNT + MAX_PURCHASE_AMOUNT) / 2
        max_possible_revenue = (
            self.args.customers
            * SHOPPING_NEED_PROBABILITY
            * self.args.days
            * avg_purchase
            / 1_000_000
        )
        self.ax_revenue.set_xlim(1, self.args.days)
        self.ax_revenue.set_ylim(0, max(1, max_possible_revenue))
        self.ax_revenue.set_title("Revenue Kumulatif dan Aversion")
        self.ax_revenue.set_xlabel("Hari")
        self.ax_revenue.set_ylabel("Revenue kumulatif (juta Rp)")
        self.ax_revenue.grid(True, alpha=0.22)
        self.ax_aversion.set_ylim(0, 1)
        self.ax_aversion.set_ylabel("Avg Parking Aversion")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Visualisasi harian baseline ABM minimarket."
    )
    parser.add_argument("--customers", type=int, default=200)
    parser.add_argument("--days", type=int, default=80)
    parser.add_argument("--parking-fee", type=int, default=2_000)
    parser.add_argument("--distance-to-B", type=float, default=1000.0)
    parser.add_argument("--distance-min", type=float, default=50.0)
    parser.add_argument("--distance-max", type=float, default=1500.0)
    parser.add_argument("--distance-step", type=float, default=50.0)
    parser.add_argument("--attractiveness-A", type=float, default=0.5)
    parser.add_argument("--attractiveness-B", type=float, default=0.5)
    parser.add_argument("--parking-aversion", type=float, default=0.4)
    parser.add_argument("--memory-strength", type=float, default=0.1)
    parser.add_argument("--wom-probability", type=float, default=0.3)
    parser.add_argument("--wom-strength", type=float, default=0.05)
    parser.add_argument("--num-contacts", type=int, default=3)
    parser.add_argument("--beta-distance", type=float, default=-1.0)
    parser.add_argument("--beta-parking", type=float, default=-1.0)
    parser.add_argument("--beta-fee-ratio", type=float, default=-2.0)
    parser.add_argument("--interval", type=int, default=350)
    parser.add_argument("--seed", type=int, default=42)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    BaselineDashboard(args)
    plt.show()


if __name__ == "__main__":
    main()
