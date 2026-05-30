"""
api.py — FastAPI endpoint untuk ParkSim.

Expose hasil simulasi DCM + ABM ke Next.js frontend via REST API.
POST /api/simulate  → jalankan DCM + ABM, kembalikan hasil lengkap.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from dcm import run_dcm
from main import MiniMarket

app = FastAPI(title="ParkSim API", version="1.0.0")

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
    n_agents: int = Field(default=200, ge=50, le=500)
    n_days: int = Field(default=60, ge=10, le=180)
    market_radius: float = Field(default=600.0, ge=100.0, le=2000.0)
    distance_between_stores: float = Field(default=500.0, ge=50.0, le=1500.0)
    parking_intensity: float = Field(default=0.7, ge=0.0, le=1.0)
    shopping_prob: float = Field(default=0.35, ge=0.05, le=1.0)
    avg_spending: int = Field(default=25000, ge=5000, le=100000)
    wom_impact: float = Field(default=0.18, ge=0.0, le=0.5)
    share_probability: float = Field(default=0.6, ge=0.0, le=1.0)
    memory_decay: float = Field(default=0.03, ge=0.0, le=0.1)
    direct_experience_impact: float = Field(default=0.35, ge=0.0, le=1.0)
    seed: int = Field(default=42)


@app.get("/")
def root():
    return {"status": "ok", "service": "ParkSim API", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    # Tahap 1: Estimasi DCM (sekali saja)
    dcm_results = run_dcm()

    # Tahap 2: Jalankan ABM
    model = MiniMarket(
        num_customers=req.n_agents,
        distance_between_stores=req.distance_between_stores,
        market_radius=req.market_radius,
        days=req.n_days,
        shopping_need_probability=req.shopping_prob,
        parking_intensity=req.parking_intensity,
        direct_experience_impact=req.direct_experience_impact,
        word_of_mouth_impact=req.wom_impact,
        share_probability=req.share_probability,
        memory_decay=req.memory_decay,
        average_spending=req.avg_spending,
        seed=req.seed,
    )

    history = model.run()  # DataFrame: index = hari (0-based), kolom = metrics

    # Tahap 3: Konversi history DataFrame → abm_daily list
    abm_daily = []
    for i, row in history.iterrows():
        visits_a = int(row.get("Visits A", 0))
        visits_b = int(row.get("Visits B", 0))
        total_shopping = visits_a + visits_b
        no_buy = max(0, req.n_agents - total_shopping)

        abm_daily.append({
            "day": int(i) + 1,
            "visits_a": visits_a,
            "visits_b": visits_b,
            "no_buy": no_buy,
            "bad_experiences": int(row.get("Bad Experiences", 0)),
            "wom_messages": int(row.get("WOM Messages", 0)),
            "avg_memory_a": float(-abs(row.get("Avg Risk A", row.get("avg_memory_a", 0)))),
            "revenue_a": int(row.get("Revenue A", 0)),
            "revenue_b": int(row.get("Revenue B", 0)),
        })

    # Tahap 4: Ekstrak agent snapshots dari state akhir model
    agent_snapshots = []
    for c in model.customers:
        choice = c.choice if c.choice is not None else "none"
        agent_snapshots.append({
            "id": int(c.unique_id),
            "x": float(c.x),
            "y": float(c.y),
            "choice": choice,
            "parking_aversion": float(c.parking_aversion),
            "memory_a": float(-abs(c.perceived_risk_a)),
            "had_bad_experience": bool(c.had_bad_experience),
        })

    sim_config = {
        "n_agents": req.n_agents,
        "n_days": req.n_days,
        "market_radius": req.market_radius,
        "store_a_x": float(model.store_a.x),
        "store_a_y": float(model.store_a.y),
        "store_b_x": float(model.store_b.x),
        "store_b_y": float(model.store_b.y),
    }

    return {
        "abm_daily": abm_daily,
        "agent_snapshots": agent_snapshots,
        "dcm_results": dcm_results,
        "sim_config": sim_config,
    }
