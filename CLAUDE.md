# CLAUDE.md — Konteks Proyek ParkSim

> Baca file ini PERTAMA sebelum file lain.
> Urutan baca: CLAUDE.md → MODEL_INTEGRATION.md → ARCHITECTURE.md → VISUALIZATION.md → TASK.md → PROGRESS.md

---

## Identitas Proyek

**Nama:** ParkSim — Simulasi Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket
**Mata kuliah:** Teknik Pemodelan dan Simulasi (TPS), DTETI UGM 2025
**Deliverable:** Interactive Next.js web app + artikel Notion + publikasi media sosial

---

## Fenomena yang Dimodelkan

Tukang parkir liar di minimarket (Indomaret/Alfamart) adalah fenomena sosial-ekonomi umum di Indonesia. Mereka memungut biaya dari pelanggan dan menciptakan ketidaknyamanan yang berpotensi membuat sebagian pelanggan memilih tidak masuk atau berpindah ke minimarket lain.

**Pertanyaan penelitian:**
> "Seberapa besar revenue minimarket yang hilang akibat keberadaan tukang parkir liar, dan bagaimana dinamika perpindahan pelanggan terjadi seiring waktu?"

---

## Dua Model yang Digunakan

### Model 1: DCM (Discrete Choice Model)
- **Tujuan:** Mengestimasi parameter preferensi konsumen dari data survei
- **Metode:** Multinomial Logit (MNL) berdasarkan Random Utility Theory
- **Input:** Data survei Stated Preference (Q1–Q8) — pilihan responden antara dua minimarket dengan atribut jarak dan keberadaan jukir
- **Output:** Koefisien β yang mengukur pengaruh tiap atribut terhadap utilitas konsumen
- **Dijalankan:** Sekali saja (estimasi parameter statis)

### Model 2: ABM (Agent-Based Model)
- **Tujuan:** Mensimulasikan dinamika populasi pelanggan selama N hari
- **Library:** Mesa (Python)
- **Input:** Koefisien β dari DCM + parameter perilaku dari survei (Q9–Q16)
- **Output:** Kunjungan dan revenue per toko per hari, dinamika persepsi risiko, penyebaran WOM
- **Dijalankan:** Berulang per step/hari simulasi

### Hubungan DCM → ABM
```
Data Survei → DCM (estimasi β sekali) → β dipakai di fungsi utilitas tiap agen ABM
                                                    ↓
                                          ABM berjalan N hari
                                                    ↓
                                    Output: dinamika kunjungan & revenue
```

---

## Parameter Model dan Sumber Survei

| Parameter ABM | Sumber | Pertanyaan Survei |
|---|---|---|
| `β_jarak` | DCM | Q1–Q8 (SP experiment) |
| `β_parkir` | DCM | Q1–Q8 (SP experiment) |
| `parking_aversion` | Survei langsung | Q9 (skala 1–10) |
| `social_sensitivity` | Survei langsung | Q10 (skala 1–10) |
| `shopping_need_probability` | Survei langsung | Q11 (frekuensi belanja) |
| `purchase_amount` | Survei langsung | Q12 (kategori nominal belanja) |
| `share_probability` | Survei langsung | Q13 (ya/mungkin/tidak cerita) |
| `memory_threshold` | Survei langsung | Q14 (berapa kali bad exp sebelum switch) |
| `distance_tolerance` | Survei langsung | Q15 (willingness-to-travel) |
| `attractiveness_weight` | Survei langsung | Q16 (rating 4 sub-faktor, skala 1–5) |
| `home_location / position` | Di-generate random | Tidak dari survei — uniform dalam radius pasar |
| `memory_B` | Asumsi konstan | Tidak dari survei — diasumsikan netral (0) karena Toko B tidak ada jukir |

---

## Stack Teknologi

```
Simulasi Backend (Python — dikerjakan anggota tim lain — JANGAN DIMODIFIKASI):
  Python 3.11+
  Mesa >= 2.3.0        # ABM engine
  statsmodels / numpy  # MNL estimation untuk DCM
  pandas
  FastAPI              # REST API untuk expose hasil simulasi ke frontend

Visualisasi Frontend (TUGAS UTAMA CLAUDE CODE):
  Next.js 14 (App Router)    # framework React SSR
  Three.js r165              # 3D rendering engine
  @react-three/fiber         # React bindings untuk Three.js
  @react-three/drei          # helpers: OrbitControls, Text, Billboard, dll
  Zustand                    # state management parameter simulasi
  Tailwind CSS               # styling
  Framer Motion              # animasi UI (panel, transisi)
  Recharts                   # chart pendukung (time series)
```

---

## Arsitektur Sistem (Ringkasan)

```
[Python ABM Backend]
  main.py  →  FastAPI endpoint  →  /api/simulate  (POST)
                                →  /api/simulate/stream  (SSE, opsional)

[Next.js Frontend]
  app/page.tsx           ← landing + parameter panel
  app/simulation/page.tsx ← halaman utama simulasi
  components/
    SimulationCanvas.tsx  ← Three.js scene utama
    ParameterPanel.tsx    ← slider + controls interaktif
    HUD.tsx               ← overlay stats real-time
    RevenueChart.tsx      ← Recharts time series
```

---

## Struktur Direktori

```
Simulation_TukangParkir/
│
├── CLAUDE.md                        ← File ini (baca pertama)
├── MODEL_INTEGRATION.md             ← Pipeline DCM+ABM, format data API
├── ARCHITECTURE.md                  ← Arsitektur Three.js, scene graph
├── VISUALIZATION.md                 ← Spesifikasi lengkap scene 3D + animasi
├── TASK.md                          ← Task breakdown + acceptance criteria
├── PROGRESS.md                      ← Status progress dan mapping parameter
│
├── minimarket_abm/                  ← Python backend (JANGAN UBAH main.py / dcm.py)
│   ├── main.py                      ← ABM engine Mesa
│   ├── dcm.py                       ← DCM estimation
│   ├── config.py                    ← Parameter simulasi
│   ├── api.py                       ← FastAPI endpoint (BUAT INI untuk expose data)
│   └── requirements.txt
│
└── parksim-frontend/                ← Next.js frontend (TUGAS UTAMA)
    ├── app/
    │   ├── page.tsx                 ← Landing / hero
    │   └── simulation/
    │       └── page.tsx             ← Halaman simulasi utama
    ├── components/
    │   ├── SimulationCanvas.tsx     ← Three.js scene
    │   ├── ParameterPanel.tsx       ← Sidebar parameter
    │   ├── HUD.tsx                  ← Overlay stats
    │   ├── RevenueChart.tsx         ← Chart revenue
    │   └── AgentLegend.tsx          ← Legenda warna agen
    ├── lib/
    │   ├── simulationStore.ts       ← Zustand store
    │   └── api.ts                   ← fetch wrapper ke Python API
    ├── public/
    │   └── textures/                ← texture bangunan, jalan, dll
    ├── package.json
    └── tailwind.config.ts
```

---

## Aturan untuk Claude Code

### DO ✅
- Fokus pada `parksim-frontend/` dan file `api.py` untuk expose data simulasi
- Gunakan `@react-three/fiber` dan `@react-three/drei` — bukan Three.js raw di dalam React
- Inject data simulasi via fetch API (POST ke `/api/simulate`) — bukan hardcode
- Gunakan Zustand untuk state management parameter
- Pertahankan nuansa visual "game-like": dark theme, neon accents, animasi halus
- Animasi agen harus terlihat seperti pergerakan orang nyata (easing, path interpolation)
- Test scene di browser sebelum melapor selesai

### DON'T ❌
- Jangan modifikasi `main.py` atau `dcm.py`
- Jangan gunakan WebSocket untuk komunikasi (gunakan REST API + polling atau SSE)
- Jangan hardcode data simulasi di frontend — selalu fetch dari backend
- Jangan gunakan `localStorage` atau `sessionStorage` untuk state utama (pakai Zustand)
- Jangan tambahkan Three.js via CDN — gunakan npm package

---

## Cara Menjalankan

```bash
# Backend Python
cd minimarket_abm
python -m venv env
source env/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload --port 8000

# Frontend Next.js (terminal terpisah)
cd parksim-frontend
npm install
npm run dev
# Buka http://localhost:3000
```
