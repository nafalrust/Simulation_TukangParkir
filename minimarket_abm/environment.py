from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass

import mesa
import pandas as pd
from mesa.datacollection import DataCollector

from agent import CustomerAgent, Store

class MiniMarket(mesa.Model):
    def __init__(
        self,
        num_customers: int,
        days: int = 60,

        # Geography
        market_radius: float = 500.0,
        distance_to_B: float = 500.0,

        # Store attributes
        has_illegal_parking: bool = True,
        parking_fee: int = 2_000,
        attractiveness_A: float = 0.5,
        attractiveness_B: float = 0.5,

        # Purchase behavior
        min_purchase_amount: int = 1_000,
        max_purchase_amount: int = 500_000,
        purchase_amount_distribution: list[tuple[int, int, float]] | None = None,
        shopping_proba: float = 0.35,

        # Agent attributes
        parking_aversion: float = 0.4,
        initial_risk_a: float = 0.0,

        # Memory and bad experience
        memory_decay: float = 0.03,
        direct_experience_impact: float = 0.35,
        bad_experience_probability: float = 0.5,

        # Word of mouth
        wom_probability: float = 0.3,
        wom_strength: float = 0.05,
        num_contacts: int = 3,

        # Score weights
        weight_distance: float = -0.002,
        weight_parking_aversion: float = -1.2,
        weight_parking_fee: float = -2.0,
        weight_risk: float = -1.0,
        weight_attractiveness: float = 1.0,

        seed: int = 42,
    ) -> None:
        super().__init__(rng=seed)
        self.random = random.Random(seed)

        # General simulation parameters
        self.days = days
        self.market_radius = market_radius
        self.distance_to_B = distance_to_B

        # Store parameters
        self.has_illegal_parking = has_illegal_parking
        self.parking_fee = parking_fee
        self.attractiveness_A = attractiveness_A
        self.attractiveness_B = attractiveness_B

        # Purchase behavior parameters
        self.min_purchase_amount = min_purchase_amount
        self.max_purchase_amount = max_purchase_amount
        self.purchase_amount_distribution = purchase_amount_distribution
        self.shopping_proba = shopping_proba

        # Agent parameters
        self.parking_aversion = parking_aversion
        self.initial_risk_a = initial_risk_a

        # Memory and experience parameters
        self.memory_decay = memory_decay
        self.direct_experience_impact = direct_experience_impact
        self.bad_experience_probability = bad_experience_probability

        # Word of mouth parameters
        self.wom_probability = wom_probability
        self.wom_strength = wom_strength
        self.num_contacts = num_contacts

        # Score weights
        self.weight_distance = weight_distance
        self.weight_parking_aversion = weight_parking_aversion
        self.weight_parking_fee = weight_parking_fee
        self.weight_risk = weight_risk
        self.weight_attractiveness = weight_attractiveness

        # Store initialization
        self.store_a = Store(
            name="A",
            x=0.0,
            y=0.0,
            has_illegal_parking=bool(has_illegal_parking),
        )

        self.store_b = Store(
            name="B",
            x=distance_to_B,
            y=0.0,
            has_illegal_parking=False,
        )

        # Customer agent initialization
        self.customers: list[CustomerAgent] = []

        for customer_id in range(num_customers):
            agent_parking_aversion = min(
                1.0,
                max(
                    0.0,
                    self.random.uniform(
                        parking_aversion - 0.2,
                        parking_aversion + 0.2,
                    ),
                ),
            )

            customer = CustomerAgent(
                model=self,
                customer_id=customer_id,
                x=self.random.uniform(
                    -market_radius,
                    distance_to_B + market_radius,
                ),
                y=self.random.uniform(
                    -market_radius,
                    market_radius,
                ),
                parking_aversion=agent_parking_aversion,
            )

            self.customers.append(customer)
        
         # Daily output variables
        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_bad_experiences = 0
        self.daily_wom_messages = 0

        self.current_day = 0
        self.daily_customer_choices = {"A": [], "B": []}
        self.choice_records = []

        # Data collection
        self.datacollector = DataCollector(
            model_reporters={
                "Visits A": lambda model: model.daily_visits["A"],
                "Visits B": lambda model: model.daily_visits["B"],
                "Revenue A": lambda model: model.daily_revenue["A"],
                "Revenue B": lambda model: model.daily_revenue["B"],
                "Bad Experiences": "daily_bad_experiences",
                "WOM Messages": "daily_wom_messages",

                "Avg Risk A": lambda model: sum(
                    customer.perceived_risk_a
                    for customer in model.customers
                ) / len(model.customers),

                "Avg Parking Aversion": lambda model: sum(
                    customer.parking_aversion
                    for customer in model.customers
                ) / len(model.customers),

                "Share Visits A": lambda model: model.daily_visits["A"]
                / max(
                    1,
                    model.daily_visits["A"] + model.daily_visits["B"],
                ),

                "Share Visits B": lambda model: model.daily_visits["B"]
                / max(
                    1,
                    model.daily_visits["A"] + model.daily_visits["B"],
                ),

                "Total Revenue": lambda model: (
                    model.daily_revenue["A"]
                    + model.daily_revenue["B"]
                ),
            }
        )
    
    def get_choice_records(self) -> pd.DataFrame:
        return pd.DataFrame(self.choice_records)

    def step(self) -> None:
        # Move to next simulation day
        self.current_day += 1

        # Reset daily outputs
        self.daily_visits = {"A": 0, "B": 0}
        self.daily_revenue = {"A": 0, "B": 0}
        self.daily_bad_experiences = 0
        self.daily_wom_messages = 0
        self.daily_customer_choices = {"A": [], "B": []}

        # Run all customer agents
        self.agents.shuffle_do("step")

        # Collect agents who had bad experience
        storytellers = [
            customer
            for customer in self.customers
            if customer.had_bad_experience
        ]

        self.daily_bad_experiences = len(storytellers)

        # Word of mouth mechanism
        for storyteller in storytellers:
            if self.random.random() >= self.wom_probability:
                continue

            contacts = [
                customer
                for customer in self.customers
                if customer is not storyteller
            ]

            listeners = self.random.sample(
                contacts,
                min(self.num_contacts, len(contacts)),
            )

            for listener in listeners:
                listener.perceived_risk_a = min(
                    1.0,
                    listener.perceived_risk_a + self.wom_strength,
                )

                self.daily_wom_messages += 1

        # Store daily data
        self.datacollector.collect(self)

    def run(self) -> pd.DataFrame:
        for _ in range(self.days):
            self.step()

        results = self.datacollector.get_model_vars_dataframe()
        results.index.name = "Day"

        return results