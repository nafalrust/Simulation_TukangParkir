from __future__ import annotations

import argparse
import os

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button, Slider

from main import (
    ASC_NO_SHOP,
    ATTRACTIVENESS_A,
    ATTRACTIVENESS_B,
    AVERSION_WEIGHT,
    BETA_ATTRACTIVENESS,
    BETA_FAR,
    BETA_HIGH_NOMINAL,
    BETA_ILLEGAL_PARKING,
    MAX_PURCHASE_AMOUNT,
    MIN_PURCHASE_AMOUNT,
    MiniMarket,
    NO_SHOP,
    SHOPPING_NEED_PROBABILITY,
)


class MiniMarketDashboard:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.day = 0
        self.running = False
        self.model = self.build_model()

        self.fig = plt.figure(figsize=(14, 8))
        grid = self.fig.add_gridspec(
            2,
            2,
            width_ratios=[1.3, 1.0],
            height_ratios=[1, 1],
        )
        self.ax_map = self.fig.add_subplot(grid[:, 0])
        self.ax_visits = self.fig.add_subplot(grid[0, 1])
        self.ax_revenue = self.fig.add_subplot(grid[1, 1])
        self.ax_aversion = self.ax_revenue.twinx()

        self.fig.subplots_adjust(bottom=0.34, wspace=0.28, hspace=0.34)

        self.beta_far_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.24, 0.50, 0.03]),
            label="Beta Jauh",
            valmin=-3.0,
            valmax=1.0,
            valinit=args.beta_far,
            valstep=0.1,
        )
        self.beta_illegal_parking_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.19, 0.50, 0.03]),
            label="Beta Parkir",
            valmin=-3.0,
            valmax=1.0,
            valinit=args.beta_illegal_parking,
            valstep=0.1,
        )
        self.beta_high_nominal_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.14, 0.50, 0.03]),
            label="Beta Nominal",
            valmin=-1.0,
            valmax=2.0,
            valinit=args.beta_high_nominal,
            valstep=0.1,
        )
        self.asc_no_shop_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.09, 0.50, 0.03]),
            label="ASC Tidak Belanja",
            valmin=-2.0,
            valmax=2.0,
            valinit=args.asc_no_shop,
            valstep=0.1,
        )
        self.attractiveness_a_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.04, 0.50, 0.03]),
            label="Attractiveness A",
            valmin=0.0,
            valmax=1.0,
            valinit=args.attractiveness_a,
            valstep=0.05,
        )
        self.attractiveness_b_slider = Slider(
            ax=self.fig.add_axes([0.16, 0.005, 0.50, 0.03]),
            label="Attractiveness B",
            valmin=0.0,
            valmax=1.0,
            valinit=args.attractiveness_b,
            valstep=0.05,
        )
        self.aversion_weight_slider = Slider(
            ax=self.fig.add_axes([0.74, 0.04, 0.20, 0.03]),
            label="Aversion",
            valmin=0.0,
            valmax=3.0,
            valinit=args.aversion_weight,
            valstep=0.1,
        )

        self.reset_button = Button(self.fig.add_axes([0.74, 0.16, 0.08, 0.045]), "Reset")
        self.step_button = Button(self.fig.add_axes([0.83, 0.16, 0.07, 0.045]), "Step")
        self.run_button = Button(self.fig.add_axes([0.91, 0.16, 0.07, 0.045]), "Run")

        self.beta_far_slider.on_changed(self.on_parameter_changed)
        self.beta_illegal_parking_slider.on_changed(self.on_parameter_changed)
        self.beta_high_nominal_slider.on_changed(self.on_parameter_changed)
        self.asc_no_shop_slider.on_changed(self.on_parameter_changed)
        self.attractiveness_a_slider.on_changed(self.on_parameter_changed)
        self.attractiveness_b_slider.on_changed(self.on_parameter_changed)
        self.aversion_weight_slider.on_changed(self.on_parameter_changed)
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

    def build_model(self) -> MiniMarket:
        beta_far = getattr(
            getattr(self, "beta_far_slider", None),
            "val",
            self.args.beta_far,
        )
        beta_illegal_parking = getattr(
            getattr(self, "beta_illegal_parking_slider", None),
            "val",
            self.args.beta_illegal_parking,
        )
        beta_high_nominal = getattr(
            getattr(self, "beta_high_nominal_slider", None),
            "val",
            self.args.beta_high_nominal,
        )
        asc_no_shop = getattr(
            getattr(self, "asc_no_shop_slider", None),
            "val",
            self.args.asc_no_shop,
        )
        aversion_weight = getattr(
            getattr(self, "aversion_weight_slider", None),
            "val",
            self.args.aversion_weight,
        )
        attractiveness_a = getattr(
            getattr(self, "attractiveness_a_slider", None),
            "val",
            self.args.attractiveness_a,
        )
        attractiveness_b = getattr(
            getattr(self, "attractiveness_b_slider", None),
            "val",
            self.args.attractiveness_b,
        )

        return MiniMarket(
            n_customers=self.args.customers,
            width=self.args.width,
            height=self.args.height,
            seed=self.args.seed,
            asc_store=self.args.asc_store,
            asc_no_shop=float(asc_no_shop),
            beta_far=float(beta_far),
            beta_illegal_parking=float(beta_illegal_parking),
            beta_high_nominal=float(beta_high_nominal),
            beta_attractiveness=self.args.beta_attractiveness,
            attractiveness_a=float(attractiveness_a),
            attractiveness_b=float(attractiveness_b),
            distance_threshold=self.args.distance_threshold,
            nominal_threshold=self.args.nominal_threshold,
            aversion_weight=float(aversion_weight),
        )

    def reset_model(self) -> None:
        self.running = False
        self.run_button.label.set_text("Run")
        self.day = 0
        self.model = self.build_model()
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
        sizes = [16 + 52 * customer.parking_aversion for customer in self.model.customers]
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

        for store in self.model.stores:
            color = "#dc2626" if store.has_illegal_parking else "#059669"
            label = (
                f"{store.name}: ada tukang parkir"
                if store.has_illegal_parking
                else f"{store.name}: tanpa tukang parkir"
            )
            self.ax_map.scatter(
                [store.x],
                [store.y],
                s=260,
                marker="s",
                c=color,
                edgecolors="#111827",
                linewidths=1.2,
                label=label,
            )

        margin_x = self.model.width * 0.06
        margin_y = self.model.height * 0.06
        self.ax_map.set_xlim(-margin_x, self.model.width + margin_x)
        self.ax_map.set_ylim(-margin_y, self.model.height + margin_y)
        self.ax_map.set_aspect("equal", adjustable="box")
        self.ax_map.grid(True, alpha=0.22)
        self.ax_map.legend(loc="upper right")
        self.ax_map.set_title(
            f"Hari {self.day} | beta jauh={self.model.beta_far:.1f}, "
            f"beta parkir={self.model.beta_illegal_parking:.1f}, "
            f"beta nominal={self.model.beta_high_nominal:.1f}, "
            f"Attr A={self.model.stores[0].attractiveness:.2f}, "
            f"B={self.model.stores[1].attractiveness:.2f}"
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
        if choice == "Minimarket A":
            return "#dc2626"
        if choice == "Minimarket B":
            return "#059669"
        return "#9ca3af"

    def update_visits_plot(self) -> None:
        self.ax_visits.clear()
        history = self.model.datacollector.get_model_vars_dataframe()

        if not history.empty:
            days = history.index + 1
            self.ax_visits.plot(
                days,
                history["Visit_Minimarket_A"],
                color="#dc2626",
                label="Minimarket A",
            )
            self.ax_visits.plot(
                days,
                history["Visit_Minimarket_B"],
                color="#059669",
                label="Minimarket B",
            )
            self.ax_visits.plot(
                days,
                history["Visit_Tidak_Belanja"],
                color="#6b7280",
                label="Tidak Belanja",
            )
            self.ax_visits.bar(
                days,
                history["Negative_Experience_Count"],
                color="#facc15",
                alpha=0.35,
                label="Pengalaman Negatif",
            )
            self.ax_visits.legend(loc="upper right")

        self.ax_visits.set_xlim(1, self.args.days)
        self.ax_visits.set_ylim(0, max(1, self.args.customers))
        self.ax_visits.set_title("Pilihan Harian")
        self.ax_visits.set_xlabel("Hari")
        self.ax_visits.set_ylabel("Jumlah agent")
        self.ax_visits.grid(True, alpha=0.22)

    def update_revenue_plot(self) -> None:
        self.ax_revenue.clear()
        self.ax_aversion.clear()
        history = self.model.datacollector.get_model_vars_dataframe()

        if not history.empty:
            days = history.index + 1
            revenue_a = history["Total_Revenue_Minimarket_A"] / 1_000_000
            revenue_b = history["Total_Revenue_Minimarket_B"] / 1_000_000
            self.ax_revenue.plot(days, revenue_a, color="#dc2626", label="Revenue A")
            self.ax_revenue.plot(days, revenue_b, color="#059669", label="Revenue B")
            self.ax_revenue.legend(loc="upper left")

            self.ax_aversion.plot(
                days,
                history["Average_Parking_Aversion"],
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
        description="Visualisasi harian ABM minimarket dari main.py."
    )
    parser.add_argument("--customers", type=int, default=200)
    parser.add_argument("--days", type=int, default=80)
    parser.add_argument("--width", type=float, default=2_000.0)
    parser.add_argument("--height", type=float, default=2_000.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--asc-store", type=float, default=0.0)
    parser.add_argument("--asc-no-shop", type=float, default=ASC_NO_SHOP)
    parser.add_argument("--beta-far", type=float, default=BETA_FAR)
    parser.add_argument("--beta-illegal-parking", type=float, default=BETA_ILLEGAL_PARKING)
    parser.add_argument("--beta-high-nominal", type=float, default=BETA_HIGH_NOMINAL)
    parser.add_argument("--beta-attractiveness", type=float, default=BETA_ATTRACTIVENESS)
    parser.add_argument("--attractiveness-a", type=float, default=ATTRACTIVENESS_A)
    parser.add_argument("--attractiveness-b", type=float, default=ATTRACTIVENESS_B)
    parser.add_argument("--distance-threshold", type=float, default=1_000.0)
    parser.add_argument("--nominal-threshold", type=float, default=20_000)
    parser.add_argument("--aversion-weight", type=float, default=AVERSION_WEIGHT)
    parser.add_argument("--interval", type=int, default=350)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    MiniMarketDashboard(args)
    plt.show()


if __name__ == "__main__":
    main()
