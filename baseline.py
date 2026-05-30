from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass

import mesa
import pandas as pd
from mesa.datacollection import DataCollector


SHOPPING_NEED_PROBABILITY = 0.35
MARKET_RADIUS = 500.0
MIN_PURCHASE_AMOUNT = 1_000
MAX_PURCHASE_AMOUNT = 200_000
MIN_CHOOSE_B_PROBABILITY = 0.05
MAX_CHOOSE_B_PROBABILITY = 0.95
SCORE_SENSITIVITY = 5.0
BASE_NEGATIVE_EXPERIENCE_PROBABILITY = 0.10
MAX_NEGATIVE_EXPERIENCE_PROBABILITY = 0.80


@dataclass(frozen=True)
class Store:
    name: str
    x: float
    y: float
    has_illegal_parking: bool


class BaselineCustomerAgent(mesa.Agent):
    """Agent pelanggan baseline: scoring sederhana, memory pribadi, dan WOM simpel."""

    def __init__(
        self,
        model: "BaselineMiniMarket",
        x: float,
        y: float,
        parking_aversion: float,
    ) -> None:
        super().__init__(model)
        self.x = x
        self.y = y
        self.purchase_amount = 0
        self.parking_aversion = parking_aversion

        self.choice: str | None = None
        self.had_negative_experience = False

    def step(self) -> None:
        self.choice = None
        self.had_negative_experience = False

        if self.random.random() > SHOPPING_NEED_PROBABILITY:
            return

        self.purchase_amount = self.random.randrange(
            MIN_PURCHASE_AMOUNT,
            MAX_PURCHASE_AMOUNT + 1,
            1_000,
        )
        distance_to_a = math.hypot(self.x - self.model.store_a.x, self.y - self.model.store_a.y)
        distance_to_b = math.hypot(self.x - self.model.store_b.x, self.y - self.model.store_b.y)

        parking_fee_effect = self.model.parking_fee / self.purchase_amount
        distance_scale = max(1.0, self.model.distance_to_B)
        parking_penalty = self.parking_aversion + parking_fee_effect

        score_a = (
            self.model.attractiveness_A
            - (distance_to_a / distance_scale)
            - parking_penalty
        )
        score_b = self.model.attractiveness_B - (distance_to_b / distance_scale)

        choose_b_probability = 1.0 / (
            1.0 + math.exp(-SCORE_SENSITIVITY * (score_b - score_a))
        )
        choose_b_probability = min(
            MAX_CHOOSE_B_PROBABILITY,
            max(MIN_CHOOSE_B_PROBABILITY, choose_b_probability),
        )

        self.choice = "B" if self.random.random() < choose_b_probability else "A"
        self.model.daily_visits[self.choice] += 1
        self.model.daily_revenue[self.choice] += self.purchase_amount

        if self.choice == "A":
            negative_experience_probability = min(
                MAX_NEGATIVE_EXPERIENCE_PROBABILITY,
                BASE_NEGATIVE_EXPERIENCE_PROBABILITY
                + (self.parking_aversion * parking_fee_effect),
            )
            if self.random.random() < negative_experience_probability:
                self.had_negative_experience = True
                self.parking_aversion = min(
                    1.0,
                    self.parking_aversion + self.model.memory_strength,
                )


class BaselineMiniMarket(mesa.Model):
    """
    Baseline ABM dua minimarket berbasis scoring probabilistik.

    Parameter konseptual:
    - Atribut toko: parking_fee, distance_to_B, attractiveness_A, attractiveness_B
    - Atribut agent: purchase_amount, parking_aversion
    - Dinamika pribadi: memory_strength
    - Dinamika sosial: wom_probability, wom_strength, num_contacts
    """

    def __init__(
        self,
        num_customers: int = 200,
        days: int = 60,
        parking_fee: int = 2_000,
        distance_to_B: float = 500.0,
        attractiveness_A: float = 0.5,
        attractiveness_B: float = 0.5,
        parking_aversion: float = 0.4,
        memory_strength: float = 0.1,
        wom_probability: float = 0.3,
        wom_strength: float = 0.05,
        num_contacts: int = 3,
        seed: int = 42,
    ) -> None:
        super().__init__(rng=seed)
        self.random = random.Random(seed)

        self.days = days
        self.parking_fee = parking_fee
        self.distance_to_B = distance_to_B
        self.attractiveness_A = attractiveness_A
        self.attractiveness_B = attractiveness_B
        self.parking_aversion = parking_aversion
        self.memory_strength = memory_strength
        self.wom_probability = wom_probability
        self.wom_strength = wom_strength
        self.num_contacts = num_contacts

        self.store_a = Store("A", 0.0, 0.0, has_illegal_parking=True)
        self.store_b = Store("B", distance_to_B, 0.0, has_illegal_parking=False)

        self.customers: list[BaselineCustomerAgent] = []
        for _ in range(num_customers):
            self.customers.append(
                BaselineCustomerAgent(
                    model=self,
                    x=self.random.uniform(-MARKET_RADIUS, distance_to_B + MARKET_RADIUS),
                    y=self.random.uniform(-MARKET_RADIUS, MARKET_RADIUS),
                    parking_aversion=min(
                        1.0,
                        max(0.0, self.random.uniform(parking_aversion - 0.2, parking_aversion + 0.2)),
                    ),
                )
            )

        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_negative_experiences = 0
        self.daily_wom_messages = 0

        self.datacollector = DataCollector(
            model_reporters={
                "Visits A": lambda model: model.daily_visits["A"],
                "Visits B": lambda model: model.daily_visits["B"],
                "Revenue A": lambda model: model.daily_revenue["A"],
                "Revenue B": lambda model: model.daily_revenue["B"],
                "Negative Experiences": "daily_negative_experiences",
                "WOM Messages": "daily_wom_messages",
                "Avg Parking Aversion": lambda model: sum(
                    customer.parking_aversion for customer in model.customers
                )
                / len(model.customers),
            }
        )

    def step(self) -> None:
        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_negative_experiences = 0
        self.daily_wom_messages = 0

        self.agents.shuffle_do("step")
        storytellers = [
            customer for customer in self.customers if customer.had_negative_experience
        ]
        self.daily_negative_experiences = len(storytellers)

        for storyteller in storytellers:
            if self.random.random() >= self.wom_probability:
                continue

            contacts = [
                customer for customer in self.customers if customer is not storyteller
            ]
            for listener in self.random.sample(
                contacts,
                min(self.num_contacts, len(contacts)),
            ):
                listener.parking_aversion = min(
                    1.0,
                    listener.parking_aversion + self.wom_strength,
                )
                self.daily_wom_messages += 1

        self.datacollector.collect(self)

    def run(self) -> pd.DataFrame:
        for _ in range(self.days):
            self.step()
        results = self.datacollector.get_model_vars_dataframe()
        results.index.name = "Day"
        return results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Baseline Mesa ABM dengan scoring probabilistik dan memory pribadi."
    )
    parser.add_argument("--customers", type=int, default=200)
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--parking-fee", type=int, default=2_000)
    parser.add_argument("--distance-to-B", type=float, default=1000.0)
    parser.add_argument("--attractiveness-A", type=float, default=0.5)
    parser.add_argument("--attractiveness-B", type=float, default=0.5)
    parser.add_argument("--parking-aversion", type=float, default=0.4)
    parser.add_argument("--memory-strength", type=float, default=0.1)
    parser.add_argument("--wom-probability", type=float, default=0.3)
    parser.add_argument("--wom-strength", type=float, default=0.05)
    parser.add_argument("--num-contacts", type=int, default=3)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    model = BaselineMiniMarket(
        num_customers=args.customers,
        days=args.days,
        parking_fee=args.parking_fee,
        distance_to_B=args.distance_to_B,
        attractiveness_A=args.attractiveness_A,
        attractiveness_B=args.attractiveness_B,
        parking_aversion=args.parking_aversion,
        memory_strength=args.memory_strength,
        wom_probability=args.wom_probability,
        wom_strength=args.wom_strength,
        num_contacts=args.num_contacts,
        seed=args.seed,
    )
    results = model.run()

    print("\nHasil baseline ABM harian:")
    print(results.tail(10).to_string())
    print("\nTotal:")
    print(
        pd.Series(
            {
                "Visits A": int(results["Visits A"].sum()),
                "Visits B": int(results["Visits B"].sum()),
                "Revenue A": int(results["Revenue A"].sum()),
                "Revenue B": int(results["Revenue B"].sum()),
                "Negative Experiences": int(results["Negative Experiences"].sum()),
                "WOM Messages": int(results["WOM Messages"].sum()),
                "Final Avg Parking Aversion": round(
                    float(results["Avg Parking Aversion"].iloc[-1]), 3
                ),
            }
        ).to_string()
    )


if __name__ == "__main__":
    main()
