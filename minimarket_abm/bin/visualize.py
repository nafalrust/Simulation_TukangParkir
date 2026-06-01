from __future__ import annotations

import argparse
import os

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button, Slider

from main import MiniMarket


class MinimarketDashboard:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.day = 0
        self.running = False
        self.model = self.build_model(args.distance)

        self.fig = plt.figure(figsize=(14, 8))
        grid = self.fig.add_gridspec(2, 2, width_ratios=[1.3, 1.0], height_ratios=[1, 1])
        self.ax_map = self.fig.add_subplot(grid[:, 0])
        self.ax_visits = self.fig.add_subplot(grid[0, 1])
        self.ax_revenue = self.fig.add_subplot(grid[1, 1])
        self.ax_risk = self.ax_revenue.twinx()

        self.fig.subplots_adjust(bottom=0.22, wspace=0.28, hspace=0.34)

        self.scatter = None
        self.store_a_marker = None
        self.store_b_marker = None
        self.visit_a_line = None
        self.visit_b_line = None
        self.revenue_a_line = None
        self.revenue_b_line = None

        self.distance_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.11, 0.55, 0.03]),
            label="Distance A-B",
            valmin=args.distance_min,
            valmax=args.distance_max,
            valinit=args.distance,
            valstep=args.distance_step,
        )
        self.reset_button = Button(self.fig.add_axes([0.74, 0.105, 0.08, 0.045]), "Reset")
        self.step_button = Button(self.fig.add_axes([0.83, 0.105, 0.07, 0.045]), "Step")
        self.run_button = Button(self.fig.add_axes([0.91, 0.105, 0.07, 0.045]), "Run")

        self.distance_slider.on_changed(self.on_distance_changed)
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

    def build_model(self, distance: float) -> MiniMarket:
        return MiniMarket(
            num_customers=self.args.customers,
            distance_between_stores=distance,
            market_radius=self.args.market_radius,
            social_degree=self.args.social_degree,
            days=self.args.days,
            shopping_need_probability=self.args.shopping_need_probability,
            parking_intensity=self.args.parking_intensity,
            word_of_mouth_impact=self.args.word_of_mouth_impact,
            share_probability=self.args.share_probability,
            seed=self.args.seed,
        )

    def reset_model(self, distance: float | None = None) -> None:
        if distance is None:
            distance = self.distance_slider.val
        self.running = False
        self.run_button.label.set_text("Run")
        self.day = 0
        self.model = self.build_model(float(distance))
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

    def on_distance_changed(self, distance: float) -> None:
        self.reset_model(distance)

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
        sizes = [
            18 + 55 * customer.perceived_risk_a for customer in self.model.customers
        ]
        edge_colors = [
            "#facc15" if customer.had_bad_experience else "#ffffff"
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
            label="B: tanpa tukang parkir",
        )

        x_min = -self.args.market_radius * 1.1
        x_max = max(self.args.market_radius, self.args.distance_max) * 1.1
        y_limit = self.args.market_radius * 1.1

        self.ax_map.set_xlim(x_min, x_max)
        self.ax_map.set_ylim(-y_limit, y_limit)
        self.ax_map.set_aspect("equal", adjustable="box")
        self.ax_map.grid(True, alpha=0.22)
        self.ax_map.legend(loc="upper right")
        self.ax_map.set_title(
            f"Hari {self.day} | Distance A-B = {self.model.store_b.x:.0f}"
        )
        self.ax_map.set_xlabel("Koordinat x")
        self.ax_map.set_ylabel("Koordinat y")

        self.ax_map.text(
            0.02,
            0.02,
            "Titik: pelanggan | Merah: pilih A | Hijau: pilih B | Abu: tidak belanja\n"
            "Ukuran titik makin besar = persepsi risiko A makin tinggi",
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
            self.ax_visits.legend(loc="upper right")

        self.ax_visits.set_xlim(1, self.args.days)
        self.ax_visits.set_ylim(0, max(1, int(self.args.customers * 0.55)))
        self.ax_visits.set_title("Kunjungan Harian")
        self.ax_visits.set_xlabel("Hari")
        self.ax_visits.set_ylabel("Jumlah visit")
        self.ax_visits.grid(True, alpha=0.22)

    def update_revenue_plot(self) -> None:
        self.ax_revenue.clear()
        self.ax_risk.clear()
        history = self.model.datacollector.get_model_vars_dataframe()

        if not history.empty:
            days = history.index + 1
            revenue_a = history["Revenue A"].cumsum() / 1_000_000
            revenue_b = history["Revenue B"].cumsum() / 1_000_000
            self.ax_revenue.plot(days, revenue_a, color="#dc2626", label="Revenue A")
            self.ax_revenue.plot(days, revenue_b, color="#059669", label="Revenue B")
            self.ax_revenue.legend(loc="upper left")

            self.ax_risk.plot(
                days,
                history["Avg Risk A"],
                color="#7c3aed",
                linestyle="--",
                label="Avg Risk A",
            )
            self.ax_risk.set_ylim(0, 1)
            self.ax_risk.set_ylabel("Avg Risk A")
            self.ax_risk.legend(loc="lower right")

        max_possible_revenue = (
            self.args.customers
            * self.args.shopping_need_probability
            * self.args.days
            * self.model.average_spending
            / 1_000_000
        )
        self.ax_revenue.set_xlim(1, self.args.days)
        self.ax_revenue.set_ylim(0, max(1, max_possible_revenue))
        self.ax_revenue.set_title("Akumulasi Revenue dan Reputasi Negatif")
        self.ax_revenue.set_xlabel("Hari")
        self.ax_revenue.set_ylabel("Revenue kumulatif (juta)")
        self.ax_revenue.grid(True, alpha=0.22)
        self.ax_risk.set_ylim(0, 1)
        self.ax_risk.set_ylabel("Avg Risk A")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Visualisasi interaktif ABM word of mouth minimarket."
    )
    parser.add_argument("--customers", type=int, default=200)
    parser.add_argument("--days", type=int, default=80)
    parser.add_argument("--distance", type=float, default=500.0)
    parser.add_argument("--distance-min", type=float, default=50.0)
    parser.add_argument("--distance-max", type=float, default=1500.0)
    parser.add_argument("--distance-step", type=float, default=50.0)
    parser.add_argument("--market-radius", type=float, default=600.0)
    parser.add_argument("--social-degree", type=int, default=6)
    parser.add_argument("--shopping-need-probability", type=float, default=0.35)
    parser.add_argument("--parking-intensity", type=float, default=0.7)
    parser.add_argument("--word-of-mouth-impact", type=float, default=0.18)
    parser.add_argument("--share-probability", type=float, default=0.6)
    parser.add_argument("--interval", type=int, default=350)
    parser.add_argument("--seed", type=int, default=42)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    MinimarketDashboard(args)
    plt.show()


if __name__ == "__main__":
    main()
