# ARCHITECTURE.md — Arsitektur Sistem & Three.js Scene Graph

---

## Gambaran Sistem End-to-End

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
                                    [FastAPI — api.py]
                                    POST /api/simulate
                                               │
                                               ▼
                                    [Next.js Frontend]
                                               │
                              ┌────────────────┴────────────────┐
                              ▼                                  ▼
                    [Three.js 3D Scene]                [Recharts Time Series]
                    (SimulationCanvas.tsx)             (RevenueChart.tsx)
                              │
                    [@react-three/fiber]
```

---

## API Contract: Python Backend → Next.js Frontend

Data dikirim via REST API. Frontend melakukan POST ke `/api/simulate` dengan parameter, dan menerima seluruh hasil simulasi dalam satu response JSON.

```typescript
// Request body (frontend → backend)
interface SimulateRequest {
  n_agents: number;          // 50–500
  n_days: number;            // 10–180
  market_radius: number;     // meter
  distance_between_stores: number;
  parking_intensity: number; // 0.0–1.0
  shopping_prob: number;
  avg_spending: number;
  wom_impact: number;
  share_probability: number;
  memory_decay: number;
  direct_experience_impact: number;
  seed: number;
}

// Response body (backend → frontend)
interface SimulateResponse {
  abm_daily: DayData[];
  agent_snapshots: AgentSnapshot[];
  dcm_results: DCMResults;
  sim_config: SimConfig;
}
```

### Format `abm_daily`
```typescript
interface DayData {
  day: number;
  visits_a: number;
  visits_b: number;
  no_buy: number;
  bad_experiences: number;
  wom_messages: number;
  avg_memory_a: number;     // float, range [-1, 0]
  revenue_a: number;        // Rupiah
  revenue_b: number;
}
```

### Format `agent_snapshots` (state hari terakhir)
```typescript
interface AgentSnapshot {
  id: number;
  x: number;        // meter dari pusat, range [-market_radius, market_radius]
  y: number;        // meter dari pusat
  choice: 'A' | 'B' | 'none';
  parking_aversion: number;   // [0, 1]
  memory_a: number;           // [-1, 0]
  had_bad_experience: boolean;
}
```

### Format `dcm_results`
```typescript
interface DCMResults {
  beta_jarak: number;
  beta_parkir: number;
  n_respondents: number;
  log_likelihood: number;
  pseudo_r2: number;
  p_value_jarak: number;
  p_value_parkir: number;
}
```

### Format `sim_config`
```typescript
interface SimConfig {
  n_agents: number;
  n_days: number;
  market_radius: number;
  store_a_x: number;
  store_a_y: number;
  store_b_x: number;
  store_b_y: number;
}
```

---

## Three.js Scene Graph

Scene dirender oleh `SimulationCanvas.tsx` menggunakan `@react-three/fiber`.

```
<Canvas>
  │
  ├── <SceneLighting>
  │     ├── AmbientLight (intensity 0.4, color #1a1a2e)
  │     ├── DirectionalLight (position [10,20,5], castShadow)
  │     ├── PointLight [Toko A] (color #ff4444, intensity 2, distance 200)
  │     └── PointLight [Toko B] (color #44ff88, intensity 2, distance 200)
  │
  ├── <Ground>
  │     ├── Plane (800×800, material: asphalt texture + normal map)
  │     ├── RoadMarkings (dashed line antara dua toko)
  │     └── GridHelper (subtle, opacity 0.08)
  │
  ├── <StoreA>   (posisi: [store_a_x, 0, store_a_y])
  │     ├── Box (bangunan minimarket, warna merah)
  │     ├── Roof (atap toko)
  │     ├── SignBoard ("TOKO A", neon merah, glow)
  │     ├── ParkingArea (area parkir, warna berbeda)
  │     ├── JukirFigure (model humanoid jukir, animasi bergerak)
  │     └── RevenueDisplay (floating text: "Rp X.XXjt", update tiap hari)
  │
  ├── <StoreB>   (posisi: [store_b_x, 0, store_b_y])
  │     ├── Box (bangunan minimarket, warna hijau)
  │     ├── Roof
  │     ├── SignBoard ("TOKO B", neon hijau, glow)
  │     └── RevenueDisplay (floating text: "Rp X.XXjt", update tiap hari)
  │
  ├── <AgentLayer>
  │     └── [N × <AgentMesh>]
  │           ├── Sphere (r=3, material berubah warna per frame)
  │           ├── Trail (ekor cahaya saat agen bergerak)
  │           └── BadExpRing (ring kuning berdenyut jika had_bad_experience)
  │
  ├── <WOMParticles>
  │     └── Partikel cahaya yang muncul dan menyebar saat WOM terjadi
  │
  ├── <DayProgressBar>
  │     └── Mesh memanjang di atas scene, progress = frame/N_DAYS
  │
  └── <CameraRig>
        ├── OrbitControls (min/max polar angle, damping)
        └── Camera default: posisi [0, 180, 250], lookAt [0, 0, 0]
```

---

## Transformasi Koordinat: Meter Simulasi → Three.js World Space

ABM menggunakan koordinat meter (x, y). Three.js menggunakan sumbu Y sebagai vertikal.
Mapping: sim_x → three_x, sim_y → three_z (bukan three_y).

```typescript
// Agen berada di ketinggian Y = 4 (sedikit di atas ground)
function simToWorld(simX: number, simY: number): [number, number, number] {
  return [simX, 4, simY];
}

// Toko A dan B juga di Y = 0 (ground level), bangunan tumbuh ke atas
const STORE_A_POS: [number, number, number] = [sim_config.store_a_x, 0, sim_config.store_a_y];
const STORE_B_POS: [number, number, number] = [sim_config.store_b_x, 0, sim_config.store_b_y];
```

---

## Layout Halaman Next.js

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER — "ParkSim" logo + tagline + tombol About                  │
├───────────────────────────────────────┬────────────────────────────┤
│                                       │  PARAMETER PANEL           │
│   THREE.JS CANVAS (3D Scene)          │  ─────────────────────     │
│                                       │  👥 Jumlah Agen [slider]   │
│   [Toko A]         [Toko B]           │  📅 Durasi (hari) [slider] │
│      🏪                🏪             │  📍 Jarak A–B [slider]     │
│   • • • • •       • • • •            │  🚫 Intensitas Jukir       │
│      •   •    →       •              │  📣 WOM Impact [slider]     │
│   • • • •         • • • •            │  🧠 Memory Decay [slider]   │
│                                       │  ─────────────────────     │
│   [HUD overlay: Hari 23/60]           │  [▶ JALANKAN] (primary)    │
│   [Rev A: Rp2.38jt  Rev B: Rp1.47jt] │  [⏸ Pause] [⏮ Reset]      │
│   [WOM: 8  BadExp: 14]               │  Speed: [●●○○○]            │
│                                       │  Day scrubber: [═══●═══]   │
├───────────────────────────────────────┴────────────────────────────┤
│  CHART PANEL (fullwidth)                                            │
│  [Kunjungan Harian — Recharts]  [Revenue Kumulatif — Recharts]     │
├────────────────────────────────────────────────────────────────────┤
│  DCM RESULTS PANEL                                                  │
│  β Jarak: -0.0023   β Jukir: -0.847   McFadden R²: 0.24          │
└────────────────────────────────────────────────────────────────────┘
```

---

## Color Palette (wajib digunakan di seluruh UI)

```typescript
export const COLORS = {
  // Background
  bg:            '#0a0a14',   // background halaman (lebih gelap dari sebelumnya)
  panelBg:       '#111827',   // background panel
  panelBorder:   '#1f2937',   // border panel
  glassBg:       'rgba(17, 24, 39, 0.8)',  // glass morphism

  // Agen
  agentA:        '#ef4444',   // agen pilih Toko A — merah
  agentB:        '#22c55e',   // agen pilih Toko B — hijau
  agentNone:     '#475569',   // agen tidak beli — abu gelap
  agentBadExp:   '#fbbf24',   // ring kuning: bad experience

  // Toko / neon
  storeANeon:    '#ff4466',   // neon sign Toko A
  storeBNeon:    '#44ffaa',   // neon sign Toko B
  storeAGlow:    'rgba(255, 68, 102, 0.3)',
  storeBGlow:    'rgba(68, 255, 170, 0.3)',

  // Chart lines
  lineA:         '#f87171',   // kunjungan Toko A
  lineB:         '#4ade80',   // kunjungan Toko B
  lineMemory:    '#a78bfa',   // avg memory A (putus-putus)
  chartGrid:     '#1e293b',

  // WOM particles
  womColor:      '#fbbf24',   // warna partikel WOM
  womGlow:       'rgba(251, 191, 36, 0.6)',

  // Teks
  textPrimary:   '#f8fafc',
  textSecondary: '#94a3b8',
  textAccent:    '#38bdf8',
  textGold:      '#fbbf24',   // revenue / angka penting

  // HUD / controls
  hudBg:         'rgba(10, 10, 20, 0.85)',
  btnPrimary:    '#3b82f6',
  btnHover:      '#2563eb',
  btnDanger:     '#ef4444',
};
```

---

## Zustand Store Structure

```typescript
// lib/simulationStore.ts
interface SimulationStore {
  // Parameters (user-controlled)
  params: SimulateRequest;
  setParam: (key: keyof SimulateRequest, value: number) => void;

  // Simulation data
  data: SimulateResponse | null;
  isLoading: boolean;
  error: string | null;

  // Playback state
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;

  // Actions
  runSimulation: () => Promise<void>;
  setFrame: (frame: number) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
}
```
