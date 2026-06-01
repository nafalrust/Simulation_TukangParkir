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
    def __init__(self, model: "MiniMarket", customer_id: int, x: float, y: float, parking_aversion: float):
        super().__init__(model)
        self.customer_id = customer_id
        self.x = x
        self.y = y
        self.purchase_amount = 0
        self.choice: str | None = None
        self.had_bad_experience = False
        self.parking_aversion = parking_aversion
        self.perceived_risk_a = model.initial_risk_a
    
    # @Behaviour functions
    # Reset function
    def reset(self) -> None:
        self.purchase_amount = 0
        self.choice = None
        self.had_bad_experience = False
    
    # Memory decay function
    def memory_decaying(self) -> None:
        baseline_risk = self.model.initial_risk_a

        self.perceived_risk_a = baseline_risk + (
            self.perceived_risk_a - baseline_risk
        ) * (1.0 - self.model.memory_decay)

        self.perceived_risk_a = min(1.0, max(0.0, self.perceived_risk_a))
    
    # purchase amount distribution
    def samp_purchase_amount(self) -> int:
        distribution = self.model.purchase_amount_distribution
        if distribution is None:
            return self.random.randrange(
                self.model.min_purchase_amount,
                self.model.max_purchase_amount + 1,
                1_000,
            )
        r = self.random.random()
        cumulative = 0.0
        for min_amount, max_amount, probability in distribution:
            cumulative += probability
            if r <= cumulative:
                return self.random.randrange(
                    min_amount,
                    max_amount + 1,
                    1_000,
                )
        # fallback in case of rounding issues
        min_amount, max_amount, _ = distribution[-1]
        return self.random.randrange(
            min_amount,
            max_amount + 1,
            1_000,
        )
            
    # handle bad experience function 
    def handle_bad_experience(self) -> None:
        if self.random.random() < self.model.bad_experience_probability:
            self.had_bad_experience = True
            self.perceived_risk_a = min(
                1.0,
                self.perceived_risk_a + self.model.direct_experience_impact,
            )

    # @Tools function
    # Calculate distance to both stores
    def return_store_distance(self) -> tuple[float, float]:
        distance_to_a = math.hypot(
            self.x - self.model.store_a.x,
            self.y - self.model.store_a.y,
        )

        distance_to_b = math.hypot(
            self.x - self.model.store_b.x,
            self.y - self.model.store_b.y,
        )

        return distance_to_a, distance_to_b

    # Calculate store score based on distance, attractiveness, parking aversion, and perceived risk
    def calculate_store_score(
        self,
        distance: float,
        attractiveness: float,
        has_illegal_parking: bool,
        perceived_risk: float = 0.0,
    ) -> float:
        parking_flag = int(has_illegal_parking)
        max_distance = math.hypot(
            self.model.distance_to_B + self.model.market_radius,
            self.model.market_radius,
        )

        distance_score = min(
            1.0,
            distance / max(1.0, max_distance),
        )

        parking_fee_score = min(
            1.0,
            self.model.parking_fee / max(1, self.purchase_amount),
        )

        score = (
            self.model.weight_attractiveness * attractiveness
            - self.model.weight_distance * distance_score
            - self.model.weight_parking_aversion * self.parking_aversion * parking_flag
            - self.model.weight_parking_fee * parking_fee_score * parking_flag
            - self.model.weight_risk * perceived_risk * parking_flag
        )

        return score

    # Softmax function to convert scores into probabilities
    def softmax(self, score_a: float, score_b: float) -> tuple[float, float]:
        max_score = max(score_a, score_b)
        exp_a = math.exp(score_a - max_score)
        exp_b = math.exp(score_b - max_score)
        total_exp = exp_a + exp_b
        probability_a = exp_a / total_exp
        probability_b = 1 - probability_a
        return probability_a, probability_b

    def step(self) -> None:
        # Reset the agent's state and apply memory decay at the beginning of each step
        self.reset()
        self.memory_decaying()
        if self.random.random() > self.model.shopping_proba:
            return
        
        # Setup variables for the decision
        self.purchase_amount = self.samp_purchase_amount()
        distance_to_a, distance_to_b = self.return_store_distance()

        perceived_risk_a_before = self.perceived_risk_a

        # Calculating scores for both stores
        score_a = self.calculate_store_score(
            distance=distance_to_a,
            attractiveness=self.model.attractiveness_A,
            has_illegal_parking=self.model.store_a.has_illegal_parking,
            perceived_risk=self.perceived_risk_a
        )
        score_b = self.calculate_store_score(
            distance=distance_to_b,
            attractiveness=self.model.attractiveness_B,
            has_illegal_parking=self.model.store_b.has_illegal_parking,
            perceived_risk=0.0 # Store B is assumed to have no perceived risk related to parking
        )

        # Calculate probabilities and choice based on scores
        proba_a, _ = self.softmax(score_a, score_b)
        self.choice = "A" if self.random.random() < proba_a else "B"
        
        # Handle bad experience if the customer chose Store A and it has illegal parking
        if self.choice == "A" and self.model.store_a.has_illegal_parking:
            self.handle_bad_experience()

        # Record
        self.model.daily_visits[self.choice] += 1
        self.model.daily_revenue[self.choice] += self.purchase_amount
        self.model.daily_customer_choices[self.choice].append(self.customer_id)
        self.model.choice_records.append(
            {
                "day": self.model.current_day,
                "customer_id": self.customer_id,
                "choice": self.choice,
                "purchase_amount": self.purchase_amount,
                "distance_to_a": distance_to_a,
                "distance_to_b": distance_to_b,
                "score_a": score_a,
                "score_b": score_b,
                "probability_a": proba_a,
                "parking_aversion": self.parking_aversion,
                "perceived_risk_a_before": perceived_risk_a_before,
                "perceived_risk_a_after": self.perceived_risk_a,
                "had_bad_experience": self.had_bad_experience,
            }
        )
