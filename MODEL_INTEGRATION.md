# MODEL_INTEGRATION.md — Pipeline DCM + ABM

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
└─────────────────────────────────────────────────────────────────┘
```

---

## Format Data Output yang Dibutuhkan Visualisasi

Ini adalah kontrak data antara kode simulasi dan komponen visualisasi. **Jika struktur data dari `main.py` berbeda, lakukan konversi di `app.py` — jangan ubah `main.py`.**

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
        "memory_a": -0.18,           # float [-1,1], negatif = pengalaman buruk
        "had_bad_experience": False  # bool, apakah kena bad exp hari terakhir
    },
    # ... satu entry per agen
]
```

### `dcm_results` — Hasil estimasi DCM
```python
dcm_results = {
    "beta_jarak": -0.0023,           # float, koefisien jarak
    "beta_parkir": -0.847,           # float, koefisien ada jukir
    "n_respondents": 87,             # int, jumlah responden survei
    "log_likelihood": -142.3,        # float
    "pseudo_r2": 0.24,               # float, McFadden R² (>0.2 = good fit)
    "p_value_jarak": 0.003,          # float
    "p_value_parkir": 0.001          # float
}
```

### `sim_config` — Konfigurasi simulasi
```python
sim_config = {
    "n_agents": 200,
    "n_days": 60,
    "market_radius": 600,            # meter, radius sebaran agen
    "store_a_x": 0,                  # float, koordinat Toko A
    "store_a_y": 0,
    "store_b_x": 500,                # float, koordinat Toko B
    "store_b_y": 0
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
   Dalam model ini memory_A berrange [-1,1], bukan [0,1].
   Negatif = pengalaman buruk terakumulasi.

❌ agent_snapshots hanya untuk hari terakhir
   Untuk visualisasi hari-hari sebelumnya, gunakan abm_daily
   dengan probabilistic coloring (lihat VISUALIZATION.md).
```

---

## Referensi Akademis

**Holm, S., Lemm, R., Thees, O., & Hilty, L. M. (2016).** Enhancing Agent-Based Models with Discrete Choice Experiments. *Journal of Artificial Societies and Social Simulation*, 19(3), 3. https://doi.org/10.18564/jasss.3121

Studi kasus pasar kayu Swiss yang menggabungkan DCE dengan ABM menggunakan random utility theory — justifikasi metodologis utama untuk pendekatan ABM+DCM proyek ini.
