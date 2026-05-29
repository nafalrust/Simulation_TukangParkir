from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass

import mesa
import pandas as pd
from mesa.datacollection import DataCollector


@dataclass(frozen=True)
class Store:
    name: str
    x: float
    y: float
    has_illegal_parking: bool


class CustomerAgent(mesa.Agent):
    def __init__(
        self,
        model: "MiniMarket",
        x: float,
        y: float,
        parking_aversion: float,
        social_susceptibility: float,
    ) -> None:
        super().__init__(model)
        self.x = x
        self.y = y
        self.parking_aversion = parking_aversion
        self.social_susceptibility = social_susceptibility
        self.perceived_risk_a = model.initial_risk_a

        self.neighbors: list[CustomerAgent] = []
        self.choice: str | None = None
        self.had_bad_experience = False

    def step(self) -> None:
        self.choice = None
        self.had_bad_experience = False
        self.perceived_risk_a *= 1.0 - self.model.memory_decay

        if self.random.random() > self.model.shopping_need_probability:
            return

        self.choice = self.choose_store()
        self.model.daily_visits[self.choice] += 1
        self.model.daily_revenue[self.choice] += self.model.average_spending

        if self.choice == "A":
            self.had_bad_experience = self.experience_illegal_parking()
            if self.had_bad_experience:
                self.perceived_risk_a = min(
                    1.0,
                    self.perceived_risk_a + self.model.direct_experience_impact,
                )

    def choose_store(self) -> str:
        score_a = self.store_score(self.model.store_a)
        score_b = self.store_score(self.model.store_b)

        if score_a == score_b:
            return self.random.choice(["A", "B"])

        return "A" if score_a > score_b else "B"

    def store_score(self, store: Store) -> float:
        distance = self.distance_to(store)
        risk = self.perceived_risk_a if store.name == "A" else 0.0
        noise = self.random.uniform(-self.model.choice_noise, self.model.choice_noise)

        return (
            self.model.base_store_attractiveness
            - self.model.distance_weight * distance
            - self.model.risk_weight * self.parking_aversion * risk
            + noise
        )

    def distance_to(self, store: Store) -> float:
        return math.hypot(self.x - store.x, self.y - store.y)

    def experience_illegal_parking(self) -> bool:
        probability = self.model.parking_intensity * self.parking_aversion
        return self.random.random() < probability

    def hear_negative_story(self) -> None:
        impact = self.model.word_of_mouth_impact * self.social_susceptibility
        self.perceived_risk_a = min(1.0, self.perceived_risk_a + impact)


class MiniMarket(mesa.Model):
    def __init__(
        self,
        num_customers: int = 200,
        distance_between_stores: float = 500.0,
        market_radius: float = 600.0,
        social_degree: int = 6,
        days: int = 60,
        shopping_need_probability: float = 0.35,
        parking_intensity: float = 0.7,
        initial_risk_a: float = 0.05,
        direct_experience_impact: float = 0.35,
        word_of_mouth_impact: float = 0.18,
        share_probability: float = 0.6,
        memory_decay: float = 0.03,
        distance_weight: float = 0.004,
        risk_weight: float = 1.4,
        choice_noise: float = 0.1,
        average_spending: int = 25_000,
        seed: int = 42,
    ) -> None:
        super().__init__(rng=seed)
        self.random = random.Random(seed)

        self.days = days
        self.shopping_need_probability = shopping_need_probability
        self.parking_intensity = parking_intensity
        self.initial_risk_a = initial_risk_a
        self.direct_experience_impact = direct_experience_impact
        self.word_of_mouth_impact = word_of_mouth_impact
        self.share_probability = share_probability
        self.memory_decay = memory_decay
        self.distance_weight = distance_weight
        self.risk_weight = risk_weight
        self.choice_noise = choice_noise
        self.average_spending = average_spending
        self.base_store_attractiveness = 1.0

        self.store_a = Store("A", 0.0, 0.0, has_illegal_parking=True)
        self.store_b = Store("B", distance_between_stores, 0.0, has_illegal_parking=False)

        self.customers: list[CustomerAgent] = []
        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_bad_experiences = 0
        self.daily_wom_messages = 0

        self._create_customers(num_customers, market_radius)
        self._create_social_network(social_degree)

        self.datacollector = DataCollector(
            model_reporters={
                "Visits A": lambda model: model.daily_visits["A"],
                "Visits B": lambda model: model.daily_visits["B"],
                "Revenue A": lambda model: model.daily_revenue["A"],
                "Revenue B": lambda model: model.daily_revenue["B"],
                "Bad Experiences": "daily_bad_experiences",
                "WOM Messages": "daily_wom_messages",
                "Avg Risk A": lambda model: model.average_perceived_risk_a(),
            }
        )

    def _create_customers(self, num_customers: int, market_radius: float) -> None:
        for _ in range(num_customers):
            customer = CustomerAgent(
                model=self,
                x=self.random.uniform(-market_radius, market_radius),
                y=self.random.uniform(-market_radius, market_radius),
                parking_aversion=self.random.uniform(0.2, 1.0),
                social_susceptibility=self.random.uniform(0.2, 1.0),
            )
            self.customers.append(customer)

    def _create_social_network(self, social_degree: int) -> None:
        for customer in self.customers:
            candidates = [other for other in self.customers if other is not customer]
            degree = min(social_degree, len(candidates))
            customer.neighbors = self.random.sample(candidates, degree)

    def step(self) -> None:
        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_bad_experiences = 0
        self.daily_wom_messages = 0

        self.agents.shuffle_do("step")
        self.daily_bad_experiences = sum(
            1 for customer in self.customers if customer.had_bad_experience
        )
        self.spread_word_of_mouth()
        self.datacollector.collect(self)

    def spread_word_of_mouth(self) -> None:
        storytellers = [
            customer for customer in self.customers if customer.had_bad_experience
        ]

        for storyteller in storytellers:
            for neighbor in storyteller.neighbors:
                if self.random.random() < self.share_probability:
                    neighbor.hear_negative_story()
                    self.daily_wom_messages += 1

    def average_perceived_risk_a(self) -> float:
        total_risk = sum(customer.perceived_risk_a for customer in self.customers)
        return total_risk / len(self.customers)

    def run(self) -> pd.DataFrame:
        for _ in range(self.days):
            self.step()
        return self.datacollector.get_model_vars_dataframe()


def run_single_scenario(args: argparse.Namespace) -> pd.DataFrame:
    model = MiniMarket(
        num_customers=args.customers,
        distance_between_stores=args.distance,
        market_radius=args.market_radius,
        days=args.days,
        seed=args.seed,
    )
    results = model.run()
    results.index.name = "Day"
    return results


def run_distance_experiment(args: argparse.Namespace) -> pd.DataFrame:
    rows = []

    for distance in args.distances:
        for replication in range(args.replications):
            model = MiniMarket(
                num_customers=args.customers,
                distance_between_stores=distance,
                market_radius=args.market_radius,
                days=args.days,
                seed=args.seed + replication,
            )
            results = model.run()
            rows.append(
                {
                    "Distance": distance,
                    "Replication": replication + 1,
                    "Total Visits A": int(results["Visits A"].sum()),
                    "Total Visits B": int(results["Visits B"].sum()),
                    "Total Revenue A": int(results["Revenue A"].sum()),
                    "Total Revenue B": int(results["Revenue B"].sum()),
                    "Final Avg Risk A": round(float(results["Avg Risk A"].iloc[-1]), 3),
                }
            )

    return pd.DataFrame(rows)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Mesa ABM: efek word of mouth tukang parkir liar pada dua minimarket."
    )
    parser.add_argument("--customers", type=int, default=200)
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--distance", type=float, default=500.0)
    parser.add_argument("--market-radius", type=float, default=600.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--experiment", action="store_true")
    parser.add_argument(
        "--distances",
        type=float,
        nargs="+",
        default=[100.0, 250.0, 500.0, 750.0, 1000.0],
    )
    parser.add_argument("--replications", type=int, default=5)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.experiment:
        results = run_distance_experiment(args)
        summary = results.groupby("Distance", as_index=False).mean(numeric_only=True)
        print("\nHasil ringkas eksperimen jarak antar minimarket:")
        print(summary.to_string(index=False))
        return

    results = run_single_scenario(args)
    print("\nHasil simulasi harian:")
    print(results.tail(10).to_string())
    print("\nTotal:")
    print(
        pd.Series(
            {
                "Visits A": int(results["Visits A"].sum()),
                "Visits B": int(results["Visits B"].sum()),
                "Revenue A": int(results["Revenue A"].sum()),
                "Revenue B": int(results["Revenue B"].sum()),
                "Bad Experiences": int(results["Bad Experiences"].sum()),
                "WOM Messages": int(results["WOM Messages"].sum()),
                "Final Avg Risk A": round(float(results["Avg Risk A"].iloc[-1]), 3),
            }
        ).to_string()
    )


if __name__ == "__main__":
    main()
