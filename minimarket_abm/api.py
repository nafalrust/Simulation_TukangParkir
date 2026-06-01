"""
api.py — FastAPI endpoint untuk ParkSim (pure ABM, tanpa DCM).

POST /api/simulate  → jalankan dua skenario ABM (dengan jukir & tanpa jukir)
                      dengan parameter identik kecuali has_illegal_parking.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from environment_fix import MiniMarket

app = FastAPI(title="ParkSim API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class SimulateRequest(BaseModel):
    # Populasi & durasi
    n_agents: int = Field(default=200, ge=50, le=500)
    n_days: int = Field(default=60, ge=10, le=180)

    # Geography
    market_radius: float = Field(default=500.0, ge=100.0, le=2000.0)
    distance_to_B: float = Field(default=500.0, ge=50.0, le=1500.0)

    # Store attributes
    parking_fee: int = Field(default=2000, ge=0, le=20000)
    attractiveness_A: float = Field(default=0.5, ge=0.0, le=1.0)
    attractiveness_B: float = Field(default=0.5, ge=0.0, le=1.0)

    # Purchase behavior
    min_purchase_amount: int = Field(default=1_000, ge=1_000)
    max_purchase_amount: int = Field(default=500_000, ge=1_000)
    purchase_amount_distribution: list[tuple[int, int, float]] | None = None
    shopping_proba: float = Field(default=0.35, ge=0.0, le=1.0)

    # Backward-compatible input name from the current frontend.
    # The new MiniMarket constructor uses shopping_proba.
    shopping_prob: float | None = Field(default=None, ge=0.0, le=1.0)

    # Agent attributes
    parking_aversion: float = Field(default=0.4, ge=0.0, le=1.0)
    initial_risk_a: float = Field(default=0.0, ge=0.0, le=1.0)

    # Memory and bad experience
    memory_decay: float = Field(default=0.03, ge=0.0, le=0.1)
    direct_experience_impact: float = Field(default=0.35, ge=0.0, le=1.0)
    bad_experience_probability: float = Field(default=0.5, ge=0.0, le=1.0)

    # Word of mouth
    wom_probability: float = Field(default=0.3, ge=0.0, le=1.0)
    wom_strength: float = Field(default=0.05, ge=0.0, le=0.5)
    num_contacts: int = Field(default=3, ge=1, le=10)

    # Bobot skor. Pada agent.py terbaru, bobot penalty bernilai positif
    # lalu dikurangkan dari skor utilitas.
    weight_distance: float = Field(default=1.0, ge=0.0, le=10.0)
    weight_parking_aversion: float = Field(default=1.2, ge=0.0, le=10.0)
    weight_parking_fee: float = Field(default=2.0, ge=0.0, le=10.0)
    weight_risk: float = Field(default=1.0, ge=0.0, le=10.0)
    weight_attractiveness: float = Field(default=2.0, ge=0.0, le=10.0)

    seed: int = Field(default=42)


def effective_shopping_proba(req: SimulateRequest) -> float:
    if req.shopping_prob is not None:
        return req.shopping_prob
    return req.shopping_proba


def build_model(req: SimulateRequest, has_illegal_parking: bool) -> MiniMarket:
    return MiniMarket(
        num_customers=req.n_agents,
        days=req.n_days,
        market_radius=req.market_radius,
        distance_to_B=req.distance_to_B,
        has_illegal_parking=has_illegal_parking,
        parking_fee=req.parking_fee,
        attractiveness_A=req.attractiveness_A,
        attractiveness_B=req.attractiveness_B,
        min_purchase_amount=req.min_purchase_amount,
        max_purchase_amount=req.max_purchase_amount,
        purchase_amount_distribution=req.purchase_amount_distribution,
        shopping_proba=effective_shopping_proba(req),
        parking_aversion=req.parking_aversion,
        initial_risk_a=req.initial_risk_a,
        memory_decay=req.memory_decay,
        direct_experience_impact=req.direct_experience_impact,
        bad_experience_probability=req.bad_experience_probability,
        wom_probability=req.wom_probability,
        wom_strength=req.wom_strength,
        num_contacts=req.num_contacts,
        weight_distance=req.weight_distance,
        weight_parking_aversion=req.weight_parking_aversion,
        weight_parking_fee=req.weight_parking_fee,
        weight_risk=req.weight_risk,
        weight_attractiveness=req.weight_attractiveness,
        seed=req.seed,
    )


def history_to_daily(history, n_agents: int) -> list[dict[str, Any]]:
    result = []
    for i, row in history.iterrows():
        visits_a = int(row.get("Visits A", 0))
        visits_b = int(row.get("Visits B", 0))
        total_visits = visits_a + visits_b
        no_buy = max(0, n_agents - visits_a - visits_b)
        result.append({
            "day": int(i) + 1,
            "visits_a": visits_a,
            "visits_b": visits_b,
            "no_buy": no_buy,
            "total_visits": total_visits,
            "share_visits_a": float(row.get("Share Visits A", 0)),
            "share_visits_b": float(row.get("Share Visits B", 0)),
            "bad_experiences": int(row.get("Bad Experiences", 0)),
            "wom_messages": int(row.get("WOM Messages", 0)),
            "avg_risk_a": float(row.get("Avg Risk A", 0)),
            "avg_parking_aversion": float(row.get("Avg Parking Aversion", 0)),
            "revenue_a": int(row.get("Revenue A", 0)),
            "revenue_b": int(row.get("Revenue B", 0)),
            "total_revenue": int(row.get("Total Revenue", 0)),
        })
    return result


def extract_snapshots(model: MiniMarket) -> list[dict[str, Any]]:
    snapshots = []
    for customer in model.customers:
        choice = customer.choice if customer.choice is not None else "none"
        snapshots.append({
            "id": int(customer.customer_id),
            "x": float(customer.x),
            "y": float(customer.y),
            "choice": choice,
            "purchase_amount": int(customer.purchase_amount),
            "parking_aversion": float(customer.parking_aversion),
            "perceived_risk_a": float(customer.perceived_risk_a),
            "had_bad_experience": bool(customer.had_bad_experience),
            "no_buy_reason": "no_need" if choice == "none" else None,
        })
    return snapshots


def choice_records_to_json(model: MiniMarket) -> list[dict[str, Any]]:
    records = []
    for record in model.choice_records:
        records.append({
            "day": int(record["day"]),
            "customer_id": int(record["customer_id"]),
            "choice": record["choice"],
            "purchase_amount": int(record["purchase_amount"]),
            "distance_to_a": float(record["distance_to_a"]),
            "distance_to_b": float(record["distance_to_b"]),
            "score_a": float(record["score_a"]),
            "score_b": float(record["score_b"]),
            "probability_a": float(record["probability_a"]),
            "parking_aversion": float(record["parking_aversion"]),
            "perceived_risk_a_before": float(record["perceived_risk_a_before"]),
            "perceived_risk_a_after": float(record["perceived_risk_a_after"]),
            "had_bad_experience": bool(record["had_bad_experience"]),
        })
    return records


def wom_records_to_json(model: MiniMarket) -> list[dict[str, Any]]:
    records = []
    for index, record in enumerate(model.wom_records):
        records.append({
            "id": index,
            "day": int(record["day"]),
            "storyteller_id": int(record["storyteller_id"]),
            "listener_id": int(record["listener_id"]),
            "storyteller_x": float(record["storyteller_x"]),
            "storyteller_y": float(record["storyteller_y"]),
            "listener_x": float(record["listener_x"]),
            "listener_y": float(record["listener_y"]),
            "risk_before": float(record["risk_before"]),
            "risk_after": float(record["risk_after"]),
            "wom_strength": float(record["wom_strength"]),
        })
    return records


def summarize_daily(daily: list[dict[str, Any]]) -> dict[str, Any]:
    visits_a = sum(day["visits_a"] for day in daily)
    visits_b = sum(day["visits_b"] for day in daily)
    total_visits = visits_a + visits_b
    revenue_a = sum(day["revenue_a"] for day in daily)
    revenue_b = sum(day["revenue_b"] for day in daily)

    return {
        "total_visits_a": visits_a,
        "total_visits_b": visits_b,
        "share_visits_a": visits_a / max(1, total_visits),
        "share_visits_b": visits_b / max(1, total_visits),
        "total_revenue_a": revenue_a,
        "total_revenue_b": revenue_b,
        "total_revenue": revenue_a + revenue_b,
        "total_bad_experiences": sum(day["bad_experiences"] for day in daily),
        "total_wom_messages": sum(day["wom_messages"] for day in daily),
        "final_avg_risk_a": daily[-1]["avg_risk_a"] if daily else 0.0,
        "final_avg_parking_aversion": (
            daily[-1]["avg_parking_aversion"] if daily else 0.0
        ),
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "ParkSim API", "version": "4.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    # Skenario 1: Toko A dengan jukir.
    model_with = build_model(req, has_illegal_parking=True)
    history_with = model_with.run()

    # Skenario 2: Toko A tanpa jukir, seed sama agar fair.
    model_without = build_model(req, has_illegal_parking=False)
    history_without = model_without.run()

    daily_with = history_to_daily(history_with, req.n_agents)
    daily_without = history_to_daily(history_without, req.n_agents)

    model_params = {
        "num_customers": req.n_agents,
        "days": req.n_days,
        "market_radius": req.market_radius,
        "distance_to_B": req.distance_to_B,
        "weight_distance": req.weight_distance,
        "weight_parking_aversion": req.weight_parking_aversion,
        "weight_parking_fee": req.weight_parking_fee,
        "weight_risk": req.weight_risk,
        "weight_attractiveness": req.weight_attractiveness,
        "parking_fee": req.parking_fee,
        "attractiveness_A": req.attractiveness_A,
        "attractiveness_B": req.attractiveness_B,
        "min_purchase_amount": req.min_purchase_amount,
        "max_purchase_amount": req.max_purchase_amount,
        "purchase_amount_distribution": req.purchase_amount_distribution,
        "shopping_proba": effective_shopping_proba(req),
        "parking_aversion": req.parking_aversion,
        "initial_risk_a": req.initial_risk_a,
        "memory_decay": req.memory_decay,
        "direct_experience_impact": req.direct_experience_impact,
        "bad_experience_probability": req.bad_experience_probability,
        "wom_probability": req.wom_probability,
        "wom_strength": req.wom_strength,
        "num_contacts": req.num_contacts,
        "seed": req.seed,
    }

    sim_config = {
        "n_agents": req.n_agents,
        "n_days": req.n_days,
        "market_radius": req.market_radius,
        "store_a_x": float(model_with.store_a.x),
        "store_a_y": float(model_with.store_a.y),
        "store_b_x": float(model_with.store_b.x),
        "store_b_y": float(model_with.store_b.y),
    }

    return {
        "model": "environment_fix.MiniMarket",
        # Skenario ADA jukir.
        "abm_daily": daily_with,
        "agent_snapshots": extract_snapshots(model_with),
        "choice_records": choice_records_to_json(model_with),
        "wom_events": wom_records_to_json(model_with),
        "summary": summarize_daily(daily_with),
        # Skenario TANPA jukir.
        "abm_daily_no_jukir": daily_without,
        "agent_snapshots_no_jukir": extract_snapshots(model_without),
        "choice_records_no_jukir": choice_records_to_json(model_without),
        "wom_events_no_jukir": wom_records_to_json(model_without),
        "summary_no_jukir": summarize_daily(daily_without),
        "model_params": model_params,
        "sim_config": sim_config,
    }
