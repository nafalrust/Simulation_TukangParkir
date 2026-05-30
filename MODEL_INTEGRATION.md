# MODEL_INTEGRATION.md — Pipeline DCM + ABM + API

---

## Mengapa DCM + ABM?

Model ini menggabungkan dua pendekatan berdasarkan paper Holm et al. (2016) *"Enhancing Agent-Based Models with Discrete Choice Experiments"* (JASSS, 19(3)):

**Masalah dengan ABM murni:** Parameter fungsi utilitas agen biasanya diasumsikan atau dikalibrasi secara ad hoc tanpa dasar empiris yang jelas. Ini membuat klaim model sulit divalidasi.

**Solusi DCM + ABM:** Preferensi agen diestimasi dari data nyata (survei) menggunakan metode ekonometri (MNL). Koefisien yang dihasilkan kemudian dipakai sebagai parameter fungsi utilitas agen di ABM — bukan asumsi, tapi hasil pengukuran.

> "The DCE method is based on random utility theory and therefore has the potential to enhance the ABM approach with a well-established economic theory." — Holm et al. (2016)

---

## Pipeline Lengkap

```
┌─────────────────────────────────────────────────────────────────┐
│  TAHAP 1: DCM — Estimasi Parameter (berjalan SEKALI)           │
│                                                                  │
│  Input: Data survei SP (Q1–Q8 Google Form)                      │
│    Setiap baris = satu pilihan responden dalam satu skenario    │
│    Atribut per skenario:                                        │
│      - jarak ke minimarket (dekat <1km / jauh ≥1km)            │
│      - ada/tidak tukang parkir liar                             │
│      - nominal belanja (<Rp20k / >Rp20k)                        │
│    Pilihan: Minimarket A / Minimarket B / Tidak jadi membeli    │
│                                                                  │
│  Proses: Multinomial Logit (MNL) estimation                     │
│    U(alt) = β_jarak×jarak + β_parkir×ada_parkir + ε            │
│    P(pilih i) = exp(Vᵢ) / Σ exp(Vⱼ)   ← softmax              │
│                                                                  │
│  Output: β_jarak, β_parkir (keduanya diharapkan negatif)       │
│    β_jarak  < 0 → makin jauh, makin tidak disukai              │
│    β_parkir < 0 → ada jukir menurunkan utilitas                 │
└────────────────────────┬────────────────────────────────────────┘
                         │  β diteruskan ke ABM sebagai parameter
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  TAHAP 2: ABM — Simulasi Dinamika (berjalan N hari)             │
│                                                                  │
│  Setup (sekali di awal):                                        │
│    N CustomerAgent, posisi random dalam radius R meter          │
│    Dua toko: A (ada jukir) dan B (tanpa jukir)                  │
│    Tiap agen punya: parking_aversion, social_sensitivity,       │
│                     memory_A, memory_B, purchase_amount         │
│                                                                  │
│  Per hari (step):                                               │
│    1. Hitung utilitas ke A dan B untuk setiap agen:             │
│       V_A = β_jarak×dist_A + β_parkir×1                        │
│             + attractiveness_A - aversion×memory_A             │
│       V_B = β_jarak×dist_B + β_parkir×0                        │
│             + attractiveness_B - aversion×memory_B             │
│    2. Pilih dengan softmax: P(A), P(B), P(tidak beli)          │
│    3. Agen yang pilih A → kemungkinan bad experience            │
│    4. Bad experience → cerita ke neighbors (WOM)                │
│       → memory_A neighbors naik (negatif lebih kuat)           │
│    5. Memory decay tiap hari (ingatan memudar)                  │
│                                                                  │
│  Output per hari: visits_A, visits_B, revenue_A, revenue_B,    │
│                   avg_memory_A, wom_count, bad_exp_count        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  TAHAP 3: FastAPI — Expose Data ke Frontend                     │
│                                                                  │
│  File: minimarket_abm/api.py                                    │
│                                                                  │
│  POST /api/simulate                                             │
│    Body: SimulateRequest (parameter dari user)                  │
│    Response: SimulateResponse (abm_daily + agent_snapshots      │
│              + dcm_results + sim_config)                        │
│                                                                  │
│  CORS enabled untuk localhost:3000 (Next.js dev)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  TAHAP 4: Next.js Frontend — Visualisasi Interaktif             │
│                                                                  │
│  lib/api.ts → fetch POST /api/simulate                         │
│  Zustand store → state management (params + data + playback)   │
│  SimulationCanvas.tsx → Three.js 3D scene                      │
│  ParameterPanel.tsx → slider real-time, trigger re-simulate    │
│  RevenueChart.tsx → Recharts time series                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Format Data Output ABM (dari `main.py`)

Ini adalah kontrak data antara kode simulasi dan API. **Jika struktur data dari `main.py` berbeda, lakukan konversi di `api.py` — jangan ubah `main.py`.**

### `abm_daily` — Time series per hari
```python
abm_daily = [
    {
        "day": 1,                    # int, hari ke-berapa
        "visits_a": 68,              # int, jumlah agen pilih Toko A
        "visits_b": 42,              # int, jumlah agen pilih Toko B
        "no_buy": 10,                # int, jumlah agen tidak jadi beli
        "bad_experiences": 14,       # int, agen kena bad experience di A
        "wom_messages": 8,           # int, pesan WOM terkirim hari itu
        "avg_memory_a": -0.12,       # float, rata-rata memory_A semua agen
        "revenue_a": 2_380_000,      # int, estimasi revenue Toko A (Rp)
        "revenue_b": 1_470_000       # int, estimasi revenue Toko B (Rp)
    },
    # ... satu entry per hari, total N hari
]
```

### `agent_snapshots` — State agen pada hari terakhir
```python
agent_snapshots = [
    {
        "id": 0,
        "x": 234.5,                  # float, koordinat x (meter dari pusat)
        "y": -112.3,                 # float, koordinat y (meter dari pusat)
        "choice": "A",               # str: "A" / "B" / "none"
        "parking_aversion": 0.73,    # float [0,1]
        "memory_a": -0.18,           # float [-1,0]
        "had_bad_experience": False  # bool
    },
    # ... satu entry per agen
]
```

### `dcm_results` — Hasil estimasi DCM
```python
dcm_results = {
    "beta_jarak": -0.0023,
    "beta_parkir": -0.847,
    "n_respondents": 87,
    "log_likelihood": -142.3,
    "pseudo_r2": 0.24,
    "p_value_jarak": 0.003,
    "p_value_parkir": 0.001
}
```

### `sim_config` — Konfigurasi simulasi
```python
sim_config = {
    "n_agents": 200,
    "n_days": 60,
    "market_radius": 600,
    "store_a_x": 0,
    "store_a_y": 0,
    "store_b_x": 500,
    "store_b_y": 0
}
```

---

## FastAPI Endpoint — `api.py`

```python
# minimarket_abm/api.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from main import MiniMarket
from dcm import run_dcm  # fungsi DCM estimation

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

class SimulateRequest(BaseModel):
    n_agents: int = 200
    n_days: int = 60
    market_radius: float = 600
    distance_between_stores: float = 500
    parking_intensity: float = 0.7
    shopping_prob: float = 0.35
    avg_spending: int = 25000
    wom_impact: float = 0.18
    share_probability: float = 0.6
    memory_decay: float = 0.03
    direct_experience_impact: float = 0.35
    seed: int = 42

@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    # Jalankan DCM (estimasi β dari data survei)
    dcm_results = run_dcm()  # baca dari file survei yang sudah ada

    # Jalankan ABM
    model = MiniMarket(
        num_customers=req.n_agents,
        distance_between_stores=req.distance_between_stores,
        # ... mapping parameter lainnya sesuai main.py
        seed=req.seed,
    )
    history = model.run()

    # Konversi history DataFrame → abm_daily list
    abm_daily = []
    for i, row in history.iterrows():
        abm_daily.append({
            "day": i + 1,
            "visits_a": int(row["Visits A"]),
            "visits_b": int(row["Visits B"]),
            "no_buy": int(row.get("No Buy", 0)),
            "bad_experiences": int(row["Bad Experiences"]),
            "wom_messages": int(row["WOM Messages"]),
            "avg_memory_a": float(row.get("Avg Memory A", row.get("Avg Risk A", 0))),
            "revenue_a": int(row["Revenue A"]),
            "revenue_b": int(row["Revenue B"]),
        })

    # Ekstrak agent snapshots dari state akhir model
    agent_snapshots = []
    for c in model.customers:
        agent_snapshots.append({
            "id": c.unique_id,
            "x": float(c.x),
            "y": float(c.y),
            "choice": c.choice or "none",
            "parking_aversion": float(c.parking_aversion),
            "memory_a": float(getattr(c, "memory_a", -c.perceived_risk_a)),
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
```

---

## Frontend API Client — `lib/api.ts`

```typescript
// parksim-frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function runSimulation(params: SimulateRequest): Promise<SimulateResponse> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.statusText}`);
  return res.json();
}
```

---

## Yang Tidak Boleh Dicampur

```
❌ Revenue ABM ≠ revenue aktual minimarket
   ABM memodelkan PROPORSI kunjungan, bukan volume absolut.
   Revenue adalah estimasi ilustratif, bukan prediksi akurat.

❌ β_parkir dari DCM ≠ probabilitas langsung
   β adalah koefisien utilitas, dipakai di softmax — bukan p_balk.

❌ memory_A ≠ perceived_risk di model lain
   Dalam model ini memory_A berrange [-1,0], negatif = pengalaman buruk.

❌ agent_snapshots hanya untuk hari terakhir
   Untuk visualisasi hari-hari sebelumnya, gunakan abm_daily
   dengan probabilistic coloring berbasis proporsi kunjungan.

❌ Frontend tidak boleh menjalankan Python langsung
   Semua komputasi ABM/DCM di Python backend via FastAPI.
```

---

## Referensi Akademis

**Holm, S., Lemm, R., Thees, O., & Hilty, L. M. (2016).** Enhancing Agent-Based Models with Discrete Choice Experiments. *Journal of Artificial Societies and Social Simulation*, 19(3), 3. https://doi.org/10.18564/jasss.3121
