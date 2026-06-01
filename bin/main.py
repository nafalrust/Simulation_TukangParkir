from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass

import mesa
import pandas as pd
from mesa.datacollection import DataCollector

SHOPPING_NEED_PROBABILITY = 0.35
NO_SHOP = "Tidak Belanja"
MARKET_RADIUS = 500.0
MIN_PURCHASE_AMOUNT = 1_000
MAX_PURCHASE_AMOUNT = 200_000
BASE_NEGATIVE_EXPERIENCE_PROBABILITY = 0.10
MAX_NEGATIVE_EXPERIENCE_PROBABILITY = 0.80
DISTANCE_THRESHOLD = 1_000.0
NOMINAL_THRESHOLD = 20_000
AVERSION_WEIGHT = 1.0
MEMORY_STRENGTH = 0.1
WOM_PROBABILITY = 0.3
WOM_STRENGTH = 0.05
NUM_CONTACTS = 3

ASC_STORE = 0.0
ASC_NO_SHOP = -0.3

BETA_FAR = -1.0
BETA_ILLEGAL_PARKING = -1.2
BETA_HIGH_NOMINAL = 0.6
BETA_ATTRACTIVENESS = 1.0
ATTRACTIVENESS_A = 0.5
ATTRACTIVENESS_B = 0.5

@dataclass(frozen=True)
class Store:
    name: str
    x: float
    y: float
    has_illegal_parking: bool
    attractiveness: float

class CustomerAgent(mesa.Agent):
    def __init__(self, model: "MiniMarket", x: float, y: float, parking_aversion: float) -> None:
        super().__init__(model)
        self.x = x
        self.y = y
        self.purchase_amount = 0.0
        self.parking_aversion = parking_aversion
        self.choice: str | None = None
        self.had_negative_experience = False

    def model_parameter(self, name: str, default: float) -> float:
        return float(getattr(self.model, name, default))
    
    def distance_to_store(self, store: Store) -> float:
        return math.hypot(self.x - store.x, self.y - store.y)

    def calculate_store_utility(
        self,
        store: Store,
        purchase_amount: float,
    ) -> float:
        distance = self.distance_to_store(store)
        distance_threshold = self.model_parameter("distance_threshold", DISTANCE_THRESHOLD)
        nominal_threshold = self.model_parameter("nominal_threshold", NOMINAL_THRESHOLD)

        is_far = 1 if distance >= distance_threshold else 0
        is_high_nominal = 1 if purchase_amount >= nominal_threshold else 0
        has_illegal_parking = 1 if store.has_illegal_parking else 0

        parking_aversion_penalty = (
            self.model_parameter("aversion_weight", AVERSION_WEIGHT)
            * self.parking_aversion * has_illegal_parking
        )
            
        return (
            self.model_parameter("asc_store", ASC_STORE)
            + self.model_parameter("beta_far", BETA_FAR) * is_far
            + self.model_parameter("beta_illegal_parking", BETA_ILLEGAL_PARKING) * has_illegal_parking
            + self.model_parameter("beta_high_nominal", BETA_HIGH_NOMINAL) * is_high_nominal
            + self.model_parameter("beta_attractiveness", BETA_ATTRACTIVENESS)
            * store.attractiveness
            - parking_aversion_penalty
        )

    def calculate_no_shop_utility(self) -> float:
        return self.model_parameter("asc_no_shop", ASC_NO_SHOP)
    
    def softmax_choice(self, utilities: dict[str, float]) -> str:
        max_u = max(utilities.values())
        exp_utilities = {
            name: math.exp(value - max_u)
            for name, value in utilities.items()
        }
        total = sum(exp_utilities.values())
        probabilities = {
            name: value / total
            for name, value in exp_utilities.items()
        }
        r = self.random.random()
        cumulative = 0.0
        for name, prob in probabilities.items():
            cumulative += prob
            if r <= cumulative:
                return name

        return list(probabilities.keys())[-1]


    def step(self) -> None:
        self.choice = None
        self.had_negative_experience = False
        self.purchase_amount = 0.0

        # Apakah perlu ke toko ?
        if self.random.random() > SHOPPING_NEED_PROBABILITY:
            self.choice = NO_SHOP
            self.model.daily_visits[NO_SHOP] += 1
            return
        
        self.purchase_amount = self.random.randrange(MIN_PURCHASE_AMOUNT, MAX_PURCHASE_AMOUNT + 1, 7000)
        utilities = {
            store.name: self.calculate_store_utility(store, self.purchase_amount)
            for store in self.model.stores
        }
        utilities[NO_SHOP] = self.calculate_no_shop_utility()

        selected_choice = self.softmax_choice(utilities)
        self.choice = selected_choice
        self.model.daily_visits[selected_choice] += 1
        if selected_choice != NO_SHOP:
            self.model.daily_revenue[selected_choice] += self.purchase_amount
            selected_store = self.model.get_store_by_name(selected_choice)
            if selected_store.has_illegal_parking:
                negative_prob = BASE_NEGATIVE_EXPERIENCE_PROBABILITY
                negative_prob += self.parking_aversion * 0.3
                negative_prob = min(
                    negative_prob,
                    MAX_NEGATIVE_EXPERIENCE_PROBABILITY,
                )
                if self.random.random() < negative_prob:
                    self.had_negative_experience = True
                    self.parking_aversion = min(
                        1.0,
                        self.parking_aversion
                        + self.model_parameter("memory_strength", MEMORY_STRENGTH),
                    )

class MiniMarket(mesa.Model):
    def __init__(
        self,
        n_customers: int = 100,
        width: float = 2_000.0,
        height: float = 2_000.0,
        seed: int | None = None,

        # Parameter DCM / utility
        asc_store: float = ASC_STORE,
        asc_no_shop: float = ASC_NO_SHOP,
        beta_far: float = BETA_FAR,
        beta_illegal_parking: float = BETA_ILLEGAL_PARKING,
        beta_high_nominal: float = BETA_HIGH_NOMINAL,
        beta_attractiveness: float = BETA_ATTRACTIVENESS,
        attractiveness_a: float = ATTRACTIVENESS_A,
        attractiveness_b: float = ATTRACTIVENESS_B,

        # Parameter threshold dan aversion
        distance_threshold: float = DISTANCE_THRESHOLD,
        nominal_threshold: float = NOMINAL_THRESHOLD,
        aversion_weight: float = AVERSION_WEIGHT,
        memory_strength: float = MEMORY_STRENGTH,
        wom_probability: float = WOM_PROBABILITY,
        wom_strength: float = WOM_STRENGTH,
        num_contacts: int = NUM_CONTACTS,
    ) -> None:
        super().__init__(seed=seed)

        self.n_customers = n_customers
        self.width = width
        self.height = height

        # Parameter yang dipanggil oleh CustomerAgent.model_parameter()
        self.asc_store = asc_store
        self.asc_no_shop = asc_no_shop
        self.beta_far = beta_far
        self.beta_illegal_parking = beta_illegal_parking
        self.beta_high_nominal = beta_high_nominal
        self.beta_attractiveness = beta_attractiveness
        self.distance_threshold = distance_threshold
        self.nominal_threshold = nominal_threshold
        self.aversion_weight = aversion_weight
        self.memory_strength = memory_strength
        self.wom_probability = wom_probability
        self.wom_strength = wom_strength
        self.num_contacts = num_contacts

        # Dua minimarket
        # A: ada tukang parkir liar
        # B: tidak ada tukang parkir liar
        self.stores = [
            Store(
                name="Minimarket A",
                x=width * 0.35,
                y=height * 0.5,
                has_illegal_parking=True,
                attractiveness=attractiveness_a,
            ),
            Store(
                name="Minimarket B",
                x=width * 0.65,
                y=height * 0.5,
                has_illegal_parking=False,
                attractiveness=attractiveness_b,
            ),
        ]

        # Variabel harian
        self.daily_visits = self.create_empty_daily_visits()
        self.daily_revenue = self.create_empty_daily_revenue()
        self.daily_wom_messages = 0

        # Variabel kumulatif
        self.total_visits = self.create_empty_daily_visits()
        self.total_revenue = self.create_empty_daily_revenue()

        # Buat agent customer
        self.customers: list[CustomerAgent] = []

        for _ in range(n_customers):
            x = self.random.uniform(0, width)
            y = self.random.uniform(0, height)

            # parking_aversion 0 sampai 1
            parking_aversion = self.random.uniform(0.0, 1.0)

            customer = CustomerAgent(
                model=self,
                x=x,
                y=y,
                parking_aversion=parking_aversion,
            )

            self.customers.append(customer)

        self.datacollector = DataCollector(
            model_reporters={
                "Visit_Minimarket_A": lambda m: m.daily_visits["Minimarket A"],
                "Visit_Minimarket_B": lambda m: m.daily_visits["Minimarket B"],
                "Visit_Tidak_Belanja": lambda m: m.daily_visits[NO_SHOP],
                "Revenue_Minimarket_A": lambda m: m.daily_revenue["Minimarket A"],
                "Revenue_Minimarket_B": lambda m: m.daily_revenue["Minimarket B"],
                "Total_Visit_Minimarket_A": lambda m: m.total_visits["Minimarket A"],
                "Total_Visit_Minimarket_B": lambda m: m.total_visits["Minimarket B"],
                "Total_Visit_Tidak_Belanja": lambda m: m.total_visits[NO_SHOP],
                "Total_Revenue_Minimarket_A": lambda m: m.total_revenue["Minimarket A"],
                "Total_Revenue_Minimarket_B": lambda m: m.total_revenue["Minimarket B"],
                "Average_Parking_Aversion": lambda m: m.average_parking_aversion(),
                "Negative_Experience_Count": lambda m: m.negative_experience_count(),
                "WOM_Messages": "daily_wom_messages",
            },
            agent_reporters={
                "Choice": "choice",
                "Purchase_Amount": "purchase_amount",
                "Parking_Aversion": "parking_aversion",
                "Had_Negative_Experience": "had_negative_experience",
            },
        )

    def create_empty_daily_visits(self) -> dict[str, int]:
        visits = {
            store.name: 0
            for store in self.stores
        }
        visits[NO_SHOP] = 0
        return visits

    def create_empty_daily_revenue(self) -> dict[str, float]:
        revenue = {
            store.name: 0.0
            for store in self.stores
        }
        return revenue

    def get_store_by_name(self, name: str) -> Store:
        for store in self.stores:
            if store.name == name:
                return store

        raise ValueError(f"Store dengan nama '{name}' tidak ditemukan.")

    def reset_daily_data(self) -> None:
        self.daily_visits = self.create_empty_daily_visits()
        self.daily_revenue = self.create_empty_daily_revenue()
        self.daily_wom_messages = 0

    def update_total_data(self) -> None:
        for choice_name, visit_count in self.daily_visits.items():
            self.total_visits[choice_name] += visit_count

        for store_name, revenue in self.daily_revenue.items():
            self.total_revenue[store_name] += revenue

    def average_parking_aversion(self) -> float:
        if not self.customers:
            return 0.0

        total_aversion = sum(
            customer.parking_aversion
            for customer in self.customers
        )

        return total_aversion / len(self.customers)

    def negative_experience_count(self) -> int:
        return sum(
            1
            for customer in self.customers
            if customer.had_negative_experience
        )

    def spread_word_of_mouth(self) -> None:
        storytellers = [
            customer
            for customer in self.customers
            if customer.had_negative_experience
        ]

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
                listener.parking_aversion = min(
                    1.0,
                    listener.parking_aversion + self.wom_strength,
                )
                self.daily_wom_messages += 1

    def step(self) -> None:
        self.reset_daily_data()

        # Urutan agent diacak agar simulasi lebih natural
        self.random.shuffle(self.customers)

        for customer in self.customers:
            customer.step()

        self.spread_word_of_mouth()
        self.update_total_data()
        self.datacollector.collect(self)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Simulasi ABM minimarket dengan DCM dan parking aversion."
    )

    # Parameter simulasi
    parser.add_argument("--customers", type=int, default=200)
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--width", type=float, default=2_000.0)
    parser.add_argument("--height", type=float, default=2_000.0)
    parser.add_argument("--seed", type=int, default=42)

    # Parameter DCM / utility
    parser.add_argument("--asc-store", type=float, default=ASC_STORE)
    parser.add_argument("--asc-no-shop", type=float, default=ASC_NO_SHOP)
    parser.add_argument("--beta-far", type=float, default=BETA_FAR)
    parser.add_argument("--beta-illegal-parking", type=float, default=BETA_ILLEGAL_PARKING)
    parser.add_argument("--beta-high-nominal", type=float, default=BETA_HIGH_NOMINAL)
    parser.add_argument("--beta-attractiveness", type=float, default=BETA_ATTRACTIVENESS)
    parser.add_argument("--attractiveness-a", type=float, default=ATTRACTIVENESS_A)
    parser.add_argument("--attractiveness-b", type=float, default=ATTRACTIVENESS_B)

    # Parameter threshold
    parser.add_argument("--distance-threshold", type=float, default=DISTANCE_THRESHOLD)
    parser.add_argument("--nominal-threshold", type=float, default=NOMINAL_THRESHOLD)

    # Parameter ABM tambahan
    parser.add_argument("--aversion-weight", type=float, default=AVERSION_WEIGHT)
    parser.add_argument("--memory-strength", type=float, default=MEMORY_STRENGTH)
    parser.add_argument("--wom-probability", type=float, default=WOM_PROBABILITY)
    parser.add_argument("--wom-strength", type=float, default=WOM_STRENGTH)
    parser.add_argument("--num-contacts", type=int, default=NUM_CONTACTS)

    # Output
    parser.add_argument("--save-csv", action="store_true")
    parser.add_argument("--model-output", type=str, default="model_results.csv")
    parser.add_argument("--agent-output", type=str, default="agent_results.csv")

    return parser


def run_simulation(args: argparse.Namespace) -> MiniMarket:
    model = MiniMarket(
        n_customers=args.customers,
        width=args.width,
        height=args.height,
        seed=args.seed,

        asc_store=args.asc_store,
        asc_no_shop=args.asc_no_shop,
        beta_far=args.beta_far,
        beta_illegal_parking=args.beta_illegal_parking,
        beta_high_nominal=args.beta_high_nominal,
        beta_attractiveness=args.beta_attractiveness,
        attractiveness_a=args.attractiveness_a,
        attractiveness_b=args.attractiveness_b,

        distance_threshold=args.distance_threshold,
        nominal_threshold=args.nominal_threshold,
        aversion_weight=args.aversion_weight,
        memory_strength=args.memory_strength,
        wom_probability=args.wom_probability,
        wom_strength=args.wom_strength,
        num_contacts=args.num_contacts,
    )

    for _ in range(args.days):
        model.step()

    return model


def print_summary(model: MiniMarket) -> None:
    model_results = model.datacollector.get_model_vars_dataframe()

    print("\n=== HASIL MODEL PER HARI ===")
    print(model_results)

    print("\n=== RINGKASAN AKHIR ===")
    print(f"Total Visit Minimarket A      : {model.total_visits['Minimarket A']}")
    print(f"Total Visit Minimarket B      : {model.total_visits['Minimarket B']}")
    print(f"Total Tidak Belanja           : {model.total_visits[NO_SHOP]}")
    print(f"Total Revenue Minimarket A    : Rp{model.total_revenue['Minimarket A']:,.0f}")
    print(f"Total Revenue Minimarket B    : Rp{model.total_revenue['Minimarket B']:,.0f}")
    print(f"Total WOM Messages            : {int(model_results['WOM_Messages'].sum())}")
    print(f"Average Parking Aversion Akhir: {model.average_parking_aversion():.3f}")


def main() -> None:
    args = build_parser().parse_args()

    model = run_simulation(args)

    model_results = model.datacollector.get_model_vars_dataframe()
    agent_results = model.datacollector.get_agent_vars_dataframe()

    print_summary(model)

    print("\n=== CONTOH DATA AGENT ===")
    print(agent_results.head())

    if args.save_csv:
        model_results.to_csv(args.model_output)
        agent_results.to_csv(args.agent_output)

        print("\nFile berhasil disimpan:")
        print(f"- {args.model_output}")
        print(f"- {args.agent_output}")


if __name__ == "__main__":
    main()
