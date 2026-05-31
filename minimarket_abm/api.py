"""
api.py — FastAPI endpoint untuk ParkSim (pure ABM, tanpa DCM).

POST /api/simulate  → jalankan dua skenario ABM (dengan jukir & tanpa jukir)
                      dengan parameter identik kecuali has_illegal_parking.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from main import MiniMarket

app = FastAPI(title="ParkSim API", version="3.0.0")

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
    market_radius: float = Field(default=500.0, ge=100.0, le=2000.0)
    distance_to_B: float = Field(default=500.0, ge=50.0, le=1500.0)

    # Toko
    parking_fee: int = Field(default=2000, ge=0, le=20000)
    attractiveness_A: float = Field(default=0.5, ge=0.0, le=1.0)
    attractiveness_B: float = Field(default=0.5, ge=0.0, le=1.0)

    # Agen
    parking_aversion: float = Field(default=0.4, ge=0.0, le=1.0)
    initial_risk_a: float = Field(default=0.05, ge=0.0, le=1.0)
    shopping_prob: float = Field(default=0.35, ge=0.05, le=1.0)

    # Memori
    memory_strength: float = Field(default=0.1, ge=0.0, le=0.5)
    memory_decay: float = Field(default=0.03, ge=0.0, le=0.1)
    direct_experience_impact: float = Field(default=0.35, ge=0.0, le=1.0)

    # Sosial (WOM)
    wom_probability: float = Field(default=0.3, ge=0.0, le=1.0)
    wom_strength: float = Field(default=0.05, ge=0.0, le=0.5)
    num_contacts: int = Field(default=3, ge=1, le=10)

    # Bobot skor
    weight_distance: float = Field(default=-0.002, ge=-0.02, le=0.0)
    weight_parking_aversion: float = Field(default=-1.2, ge=-5.0, le=0.0)
    weight_parking_fee: float = Field(default=-2.0, ge=-5.0, le=0.0)
    weight_risk: float = Field(default=-1.0, ge=-5.0, le=0.0)
    weight_attractiveness: float = Field(default=1.0, ge=0.0, le=5.0)

    seed: int = Field(default=42)


def build_model(req: SimulateRequest, has_illegal_parking: int) -> MiniMarket:
    return MiniMarket(
        num_customers=req.n_agents,
        days=req.n_days,
        market_radius=req.market_radius,
        distance_to_B=req.distance_to_B,
        has_illegal_parking=has_illegal_parking,
        parking_fee=req.parking_fee,
        attractiveness_A=req.attractiveness_A,
        attractiveness_B=req.attractiveness_B,
        parking_aversion=req.parking_aversion,
        initial_risk_a=req.initial_risk_a,
        shopping_need_probability=req.shopping_prob,
        memory_strength=req.memory_strength,
        memory_decay=req.memory_decay,
        direct_experience_impact=req.direct_experience_impact,
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


def history_to_daily(history, n_agents: int) -> list[dict]:
    result = []
    for i, row in history.iterrows():
        visits_a = int(row.get("Visits A", 0))
        visits_b = int(row.get("Visits B", 0))
        no_buy = max(0, n_agents - visits_a - visits_b)
        result.append({
            "day": int(i) + 1,
            "visits_a": visits_a,
            "visits_b": visits_b,
            "no_buy": no_buy,
            "bad_experiences": int(row.get("Bad Experiences", 0)),
            "wom_messages": int(row.get("WOM Messages", 0)),
            "avg_risk_a": float(row.get("Avg Risk A", 0)),
            "avg_parking_aversion": float(row.get("Avg Parking Aversion", 0)),
            "revenue_a": int(row.get("Revenue A", 0)),
            "revenue_b": int(row.get("Revenue B", 0)),
        })
    return result


def extract_choices_per_day(model: MiniMarket) -> list[dict[str, str]]:
    """
    Konversi daily_choices_history (list[dict[int, str]]) ke format JSON-safe.
    Key dikonversi ke string karena JSON hanya mendukung string key.
    Nilai: "A", "B", atau tidak ada key (berarti "stay").
    """
    return [
        {str(cid): choice for cid, choice in day.items()}
        for day in model.daily_choices_history
    ]


def extract_snapshots(model: MiniMarket) -> list[dict]:
    snapshots = []
    for c in model.customers:
        choice = c.choice if c.choice is not None else "none"
        snapshots.append({
            "id": int(c.customer_id),
            "x": float(c.x),
            "y": float(c.y),
            "choice": choice,
            "parking_aversion": float(c.parking_aversion),
            "perceived_risk_a": float(c.perceived_risk_a),
            "had_bad_experience": bool(c.had_bad_experience),
            "no_buy_reason": "no_need" if choice == "none" else None,
        })
    return snapshots


@app.get("/")
def root():
    return {"status": "ok", "service": "ParkSim API", "version": "3.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    # Skenario 1: Toko A dengan jukir (has_illegal_parking=1)
    model_with = build_model(req, has_illegal_parking=1)
    history_with = model_with.run()

    # Skenario 2: Toko A tanpa jukir (has_illegal_parking=0), seed sama agar fair
    model_without = build_model(req, has_illegal_parking=0)
    history_without = model_without.run()

    model_params = {
        "weight_distance": req.weight_distance,
        "weight_parking_aversion": req.weight_parking_aversion,
        "weight_parking_fee": req.weight_parking_fee,
        "weight_risk": req.weight_risk,
        "weight_attractiveness": req.weight_attractiveness,
        "parking_fee": req.parking_fee,
        "attractiveness_A": req.attractiveness_A,
        "attractiveness_B": req.attractiveness_B,
        "wom_probability": req.wom_probability,
        "wom_strength": req.wom_strength,
        "memory_strength": req.memory_strength,
        "memory_decay": req.memory_decay,
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
        # Skenario ADA jukir (default yang ditampilkan di 3D scene)
        "abm_daily": history_to_daily(history_with, req.n_agents),
        "agent_snapshots": extract_snapshots(model_with),
        "agent_choices_per_day": extract_choices_per_day(model_with),
        # Skenario TANPA jukir (untuk perbandingan di Charts)
        "abm_daily_no_jukir": history_to_daily(history_without, req.n_agents),
        "agent_snapshots_no_jukir": extract_snapshots(model_without),
        "agent_choices_per_day_no_jukir": extract_choices_per_day(model_without),
        "model_params": model_params,
        "sim_config": sim_config,
    }
