"""
api.py — FastAPI endpoint untuk ParkSim (pure ABM, tanpa DCM).

POST /api/simulate  → jalankan ABM weighted-scoring+softmax, kembalikan hasil lengkap.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from main import MiniMarket

app = FastAPI(title="ParkSim API", version="2.0.0")

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

    # Bobot skor (semua negatif untuk distance/aversion/fee/risk, positif untuk attractiveness)
    weight_distance: float = Field(default=-0.002, ge=-0.02, le=0.0)
    weight_parking_aversion: float = Field(default=-1.2, ge=-5.0, le=0.0)
    weight_parking_fee: float = Field(default=-2.0, ge=-5.0, le=0.0)
    weight_risk: float = Field(default=-1.0, ge=-5.0, le=0.0)
    weight_attractiveness: float = Field(default=1.0, ge=0.0, le=5.0)

    seed: int = Field(default=42)


@app.get("/")
def root():
    return {"status": "ok", "service": "ParkSim API", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    model = MiniMarket(
        num_customers=req.n_agents,
        days=req.n_days,
        market_radius=req.market_radius,
        distance_to_B=req.distance_to_B,
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

    history = model.run()  # DataFrame: index = hari (0-based)

    # Konversi history DataFrame → abm_daily list
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
            "avg_risk_a": float(row.get("Avg Risk A", 0)),
            "avg_parking_aversion": float(row.get("Avg Parking Aversion", 0)),
            "revenue_a": int(row.get("Revenue A", 0)),
            "revenue_b": int(row.get("Revenue B", 0)),
        })

    # Ekstrak agent snapshots dari state akhir model
    #
    # Penjelasan logika choice:
    #   choice == None  →  agen tidak punya kebutuhan belanja hari ini
    #                      (random() > shopping_need_probability)
    #   choice == "A"   →  memilih Toko A (softmax probability_a menang)
    #   choice == "B"   →  memilih Toko B (softmax probability_b menang)
    #
    # Tidak ada mekanisme "berniat ke toko lalu mundur karena jukir".
    # Agen yang takut jukir hanya mendapat skor A yang lebih rendah →
    # probabilitas softmax B naik → memilih B, bukan none.
    agent_snapshots = []
    for c in model.customers:
        choice = c.choice if c.choice is not None else "none"
        no_buy_reason = "no_need" if choice == "none" else None

        agent_snapshots.append({
            "id": int(c.unique_id),
            "x": float(c.x),
            "y": float(c.y),
            "choice": choice,
            "parking_aversion": float(c.parking_aversion),
            "perceived_risk_a": float(c.perceived_risk_a),
            "had_bad_experience": bool(c.had_bad_experience),
            "no_buy_reason": no_buy_reason,
        })

    # Model parameters untuk konteks frontend
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
        "store_a_x": float(model.store_a.x),
        "store_a_y": float(model.store_a.y),
        "store_b_x": float(model.store_b.x),
        "store_b_y": float(model.store_b.y),
    }

    return {
        "abm_daily": abm_daily,
        "agent_snapshots": agent_snapshots,
        "model_params": model_params,
        "sim_config": sim_config,
    }
