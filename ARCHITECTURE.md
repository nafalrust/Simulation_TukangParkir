# ARCHITECTURE.md — Arsitektur Sistem

---

## Gambaran Sistem

```
[Google Form Survei — 16 pertanyaan]
         │
         ├── Q1–Q8  (SP experiment) ──► DCM Estimation ──► β_jarak, β_parkir
         │
         └── Q9–Q16 (attitudinal) ──► Parameter ABM:
                                        parking_aversion    (Q9)
                                        social_sensitivity  (Q10)
                                        shopping_prob       (Q11)
                                        purchase_amount     (Q12)
                                        share_probability   (Q13)
                                        memory_threshold    (Q14)
                                        distance_tolerance  (Q15)
                                        attractiveness      (Q16)
                                               │
                                               ▼
                                    [Mesa ABM — N hari simulasi]
                                               │
                              ┌────────────────┴────────────────┐
                              ▼                                  ▼
                    [abm_daily: stats/hari]         [agent_snapshots: state agen]
                              │                                  │
                              └────────────────┬────────────────┘
                                               ▼
                                    [Streamlit App — app.py]
                                               │
                              ┌────────────────┴────────────────┐
                              ▼                                  ▼
                    [p5.js Animation]                  [Plotly Charts]
                    (components/                       (chart pendukung)
                    minimarket_animation.html)
                              │
                    [st.components.v1.html()]
```

---

## Cara Inject Data Python → p5.js

Data dari Python di-inject ke HTML sebagai JavaScript literal via string replacement. Tidak ada komunikasi real-time — data di-bake saat komponen dirender.

```python
# Di app.py
import json
from pathlib import Path
import streamlit.components.v1 as components

def render_abm_animation(abm_daily, agent_snapshots, dcm_results, sim_config):
    template = (
        Path(__file__).parent / "components" / "minimarket_animation.html"
    ).read_text(encoding="utf-8")

    html = template \
        .replace("'__ABM_DAILY__'",  json.dumps(abm_daily)) \
        .replace("'__AGENTS__'",     json.dumps(agent_snapshots)) \
        .replace("'__DCM__'",        json.dumps(dcm_results)) \
        .replace("'__CONFIG__'",     json.dumps(sim_config))

    components.html(html, height=600, scrolling=False)
```

Di dalam HTML template, placeholder ditulis sebagai string literal:
```html
<script>
  const abmDaily   = '__ABM_DAILY__';   // diganti json.dumps(abm_daily)
  const agentData  = '__AGENTS__';      // diganti json.dumps(agent_snapshots)
  const dcmResults = '__DCM__';         // diganti json.dumps(dcm_results)
  const simConfig  = '__CONFIG__';      // diganti json.dumps(sim_config)
</script>
```

---

## Layout Canvas Animasi p5.js

Canvas ukuran **720 × 520 px**, dibagi tiga zona:

```
┌─────────────────────────────────────────────────────────────────┐
│  PANEL KIRI (355 × 420px) — Peta Agen                          │
│                                                                  │
│  [🏪 A]  ·  ·  ·  ·  ·  ·  ·  [🏪 B]                          │
│                                                                  │
│   •  •  •  •  •  •  •  •  •   Titik = agen pelanggan          │
│  •  •  •  •  •  •  •  •  •  • Merah  = pilih Toko A           │
│   •  •  •  •  •  •  •  •  •   Hijau  = pilih Toko B           │
│                                Abu    = tidak jadi beli         │
│                                Ukuran ∝ |memory_A| agen        │
│                                Border kuning = bad exp hari ini │
├─────────────────────────────────────────────────────────────────┤
│  PANEL KANAN (365 × 420px) — Chart Kunjungan Harian            │
│                                                                  │
│  Kunjungan ──────────────────────────────────                   │
│  Toko A    ─────────────────── (merah)                         │
│  Toko B         ─────────────── (hijau)                        │
│  Avg Memory A  ················ (ungu, putus-putus)             │
│                                                                  │
│  Sumbu X: Hari ke-1 → ke-N                                     │
│  Chart tumbuh real-time seiring playback                       │
├─────────────────────────────────────────────────────────────────┤
│  HUD BAWAH (720 × 60px) — Stats + Controls                     │
│                                                                  │
│  Hari: 23/60  Rev A: Rp2.38jt  Rev B: Rp1.47jt                │
│  WOM: 8  Bad Exp: 14  Avg Memory A: -0.18                      │
│                                                                  │
│  [◀◀ Awal] [▶/⏸ Play] [▶▶ Akhir]  Speed:[●●○○○]  Day:[══●══] │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Palette (wajib digunakan)

```javascript
const COLORS = {
  // Background
  bg:            '#0f172a',   // background canvas
  panelBg:       '#1e293b',   // background tiap panel
  border:        '#334155',   // separator antar panel

  // Agen
  agentA:        '#ef4444',   // agen pilih Toko A — merah
  agentB:        '#22c55e',   // agen pilih Toko B — hijau
  agentNone:     '#64748b',   // agen tidak beli — abu
  agentBadExp:   '#fbbf24',   // border kuning: bad experience hari ini

  // Toko
  storeA:        '#ef4444',   // ikon/label Toko A
  storeB:        '#22c55e',   // ikon/label Toko B

  // Chart lines
  lineA:         '#f87171',   // garis kunjungan Toko A
  lineB:         '#4ade80',   // garis kunjungan Toko B
  lineMemory:    '#a78bfa',   // garis avg memory A (putus-putus)
  chartGrid:     '#1e293b',   // grid chart

  // Teks
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textAccent:    '#38bdf8',

  // Controls
  hudBg:         '#0f172a',
  btnActive:     '#3b82f6',
  btnHover:      '#2563eb',
  btnInactive:   '#334155'
};
```

---

## Transformasi Koordinat: Meter Simulasi → Pixel Canvas

Agen di ABM memiliki koordinat dalam meter (misal x=234.5, y=-112.3). Perlu dikonversi ke pixel canvas di panel kiri.

```javascript
// Panel kiri: x dari 0 ke LEFT_W, y dari 0 ke MAP_H
const LEFT_W = 355, MAP_H = 420;

function toCanvasX(simX, config) {
    // simX range: [-market_radius, store_b_x + market_radius]
    const minX = -config.market_radius;
    const maxX = config.store_b_x + config.market_radius;
    return p.map(simX, minX, maxX, 20, LEFT_W - 20);
}

function toCanvasY(simY, config) {
    // simY range: [-market_radius, market_radius]
    return p.map(simY, -config.market_radius, config.market_radius, MAP_H - 20, 20);
}
```

---

## Behavior Animasi

```
Mode PLAYBACK (default saat pertama dibuka):
  - Mulai dari hari 1, bergerak ke hari N
  - Per frame: render state hari ke-[frame]
  - Panel kiri: warna agen berubah per hari (probabilistic dari abm_daily)
  - Panel kanan: chart tumbuh satu titik per hari
  - HUD: stats update real-time

Mode FINAL STATE (setelah playback selesai atau klik ▶▶):
  - Panel kiri: render agent_snapshots (posisi & warna hari terakhir)
  - Panel kanan: full time series
  - HUD: stats hari terakhir

Coloring agen untuk hari bukan hari terakhir:
  Karena agent_snapshots hanya tersedia untuk hari terakhir,
  gunakan p.noise() deterministik untuk assign warna per agen
  berdasarkan proporsi visits_a/visits_b/no_buy hari itu:

  const d = abmDaily[frame];
  const total = d.visits_a + d.visits_b + d.no_buy;
  const pA = d.visits_a / total;
  const pB = d.visits_b / total;
  // Noise deterministik agar warna konsisten tiap render
  const r = p.noise(ag.id * 0.1 + frame * 0.3);
  color = r < pA ? COLORS.agentA : r < pA+pB ? COLORS.agentB : COLORS.agentNone;
```
