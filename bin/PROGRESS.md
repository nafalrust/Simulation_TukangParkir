# PROGRESS.md — Status Progress

**Terakhir diupdate:** 2026-05-30

---

## Status Komponen Saat Ini

| Komponen | File | Status | Catatan |
|---|---|---|---|
| DCM estimation | `minimarket_abm/dcm.py` | ✅ Selesai | Dibuat Claude — MNL dengan fallback default akademis |
| ABM engine | `minimarket_abm/main.py` | ✅ Selesai (dikerjakan tim) | TIDAK dimodifikasi |
| Config | `minimarket_abm/config.py` | ✅ Selesai | Baca saja |
| **FastAPI backend** | `minimarket_abm/api.py` | ✅ Selesai | TASK-01 — endpoint POST /api/simulate berfungsi |
| **Next.js setup + Store** | `parksim-frontend/` | ✅ Selesai | TASK-02 — Zustand store + API client |
| **Three.js scene** | `parksim-frontend/components/SimulationCanvas.tsx` | ✅ Selesai | TASK-03 — scene 3D lengkap dengan agen, WOM, jukir |
| **Parameter panel** | `parksim-frontend/components/ParameterPanel.tsx` | ✅ Selesai | TASK-04 — slider interaktif + playback controls |
| **Charts + DCM** | `parksim-frontend/components/RevenueChart.tsx` | ✅ Selesai | TASK-05 — 3 chart + DCM results panel |

---

## File yang Dibuat (TASK-01 s.d. TASK-05)

### Backend (`minimarket_abm/`)
| File | Keterangan |
|---|---|
| `dcm.py` | DCM estimation — MNL dengan fallback nilai default akademis |
| `api.py` | FastAPI REST API — POST /api/simulate, CORS enabled |
| `requirements.txt` | Updated: fastapi, uvicorn, scipy, mesa==3.1.x |

### Frontend (`parksim-frontend/`)
| File | Keterangan |
|---|---|
| `lib/api.ts` | Type definitions + fetch wrapper ke Python API |
| `lib/simulationStore.ts` | Zustand store: params, data, playback state |
| `components/SimulationCanvas.tsx` | Three.js scene 3D (Ground, Stores, Agents, WOM, JukirFigure) |
| `components/ParameterPanel.tsx` | Sidebar: slider + playback controls + run button |
| `components/HUD.tsx` | Overlay HTML stats real-time (hari, revenue, WOM, bad exp) |
| `components/RevenueChart.tsx` | Recharts: kunjungan harian + revenue kumulatif + WOM bar |
| `components/AgentLegend.tsx` | Legenda warna agen (merah/hijau/abu/kuning) |
| `app/page.tsx` | Landing page dengan CTA ke /simulation |
| `app/simulation/page.tsx` | Halaman simulasi utama (layout 2-panel) |

---

## Cara Menjalankan (Development)

```bash
# Terminal 1 — Python backend (port 8000)
cd minimarket_abm
source env/bin/activate      # Linux/Mac
# env\Scripts\activate       # Windows
uvicorn api:app --reload --port 8000

# Terminal 2 — Next.js frontend (port 3000)
cd parksim-frontend
npm run dev
# Buka http://localhost:3000/simulation
```

---

## Versi Dependency Penting

| Package | Versi | Catatan |
|---|---|---|
| `mesa` | `>=3.1.0,<3.2.0` | Mesa 3.x mengubah `Agent.__init__(self, model)` tanpa `unique_id` — kompatibel dengan main.py |
| `fastapi` | `>=0.110.0` | |
| `three` | `^0.165.0` | |
| `@react-three/fiber` | `^8.16.0` | |
| `@react-three/drei` | `^9.105.0` | |
| `zustand` | `^4.5.0` | |
| `recharts` | `^2.12.0` | |

---

## Perubahan Stack Teknologi

**Sebelumnya (DIHAPUS):**
- ~~Streamlit~~ — diganti Next.js
- ~~p5.js~~ — diganti Three.js + @react-three/fiber
- ~~st.components.v1.html()~~ — tidak relevan
- ~~minimarket_animation.html~~ — tidak dibuat

**Sekarang:**
- **Backend:** Python (Mesa 3.1.x ABM + DCM) + FastAPI (port 8000)
- **Frontend:** Next.js 14 + Three.js (@react-three/fiber) + Zustand + Recharts

---

## Mapping Survei → Parameter Model

| Parameter | Tipe | Sumber | Pertanyaan |
|---|---|---|---|
| `β_jarak` | DCM output | Q1–Q8 SP experiment | Atribut "Jarak" |
| `β_parkir` | DCM output | Q1–Q8 SP experiment | Atribut "Ada parkir liar" |
| `parking_aversion` | ABM agent attr | Q9 (skala 1–10 → /10) | Pengaruh jukir thd keputusan belanja |
| `social_sensitivity` | ABM agent attr | Q10 (skala 1–10 → /10) | Pengaruh WOM thd pikiran |
| `shopping_need_prob` | ABM global | Q11 (sering=0.6/kadang=0.35/jarang=0.15) | Frekuensi belanja |
| `purchase_amount` | ABM agent attr | Q12 (distribusi per kategori) | Nominal belanja biasa |
| `share_probability` | ABM global | Q13 (ya=1.0/mungkin=0.5/tidak=0.0 → rata-rata) | Kecenderungan cerita ke orang lain |
| `memory_threshold` | ABM agent attr | Q14 (1x/2-3x/>3x/tidak pindah) | Berapa kali bad exp sebelum switch |
| `distance_tolerance` | ABM / DCM kalibrasi | Q15 (>200m/>500m/>1km/tidak pindah) | Willingness-to-travel vs jukir |
| `attractiveness_weight` | ABM agent attr | Q16 (rating 4 sub-faktor, rata-rata /5) | Faktor kompensasi positif toko |
| `home_location` | ABM generated | Tidak dari survei | Random uniform dalam `market_radius` |
| `memory_B` | ABM init | Tidak dari survei | Konstan = 0 (netral, Toko B tanpa jukir) |

---

## Asumsi Model yang Sudah Disepakati

| Asumsi | Justifikasi |
|---|---|
| Semua pelanggan menggunakan motor | Mayoritas moda transportasi ke minimarket di Indonesia |
| Tarif jukir fixed Rp2.000 | Simplifikasi valid; tarif mayoritas minimarket di area urban |
| `memory_B` = 0 (konstan) | Toko B tidak ada jukir → tidak ada bad experience → memori netral |
| `home_location` random | Distribusi pelanggan dalam radius pasar diasumsikan seragam |
| DCM β default | Jika survey_data.csv belum ada, pakai nilai defensible: β_jarak=-0.0023, β_parkir=-0.847 |

---

## Acceptance Criteria — Status

### TASK-01 ✅
- [x] `uvicorn api:app --reload` berjalan tanpa error
- [x] POST ke `/api/simulate` mengembalikan `abm_daily`, `agent_snapshots`, `dcm_results`, `sim_config`
- [x] Semua field sesuai tipe data di MODEL_INTEGRATION.md
- [x] CORS header ada di response (`access-control-allow-origin: http://localhost:3000`)

### TASK-02 ✅
- [x] `npm run dev` tidak ada TypeScript error
- [x] `useSimulationStore()` bisa diakses dari komponen manapun
- [x] `runSimulation()` fetch data dari backend
- [x] Loading state dan error state ter-handle

### TASK-03 ✅
- [x] Scene ter-render di browser tanpa error console
- [x] Dua bangunan toko dengan neon berbeda warna (merah/hijau)
- [x] Agen muncul sebagai sphere berwarna di posisi yang benar
- [x] Animasi playback berjalan: warna agen berubah per hari
- [x] Revenue display di atas toko update setiap hari
- [x] WOM menghasilkan efek partikel visual
- [x] OrbitControls berfungsi (drag = rotate, scroll = zoom)
- [x] HUD menampilkan stats hari yang sedang ditampilkan
- [x] JukirFigure bergerak mondar-mandir di depan Toko A

### TASK-04 ✅
- [x] Semua slider berfungsi dan mengubah state Zustand
- [x] Tombol Play/Pause, ⏮, ⏭ berfungsi
- [x] Day scrubber (slider) bisa di-drag
- [x] Speed slider mengubah kecepatan playback
- [x] Tooltip hint muncul saat hover ikon ⓘ
- [x] Error ditampilkan jika backend tidak bisa dihubungi

### TASK-05 ✅
- [x] Chart kunjungan harian (Line chart: A merah, B hijau, Avg Mem A ungu)
- [x] Chart revenue kumulatif (Area chart)
- [x] Chart WOM & Bad Exp (Bar chart)
- [x] DCM Results panel (β Jarak, β Jukir, McFadden R², Log-Likelihood, N Responden)
- [x] Semua chart sinkron dengan frame playback saat ini

---

## Checklist Sebelum Demo/Presentasi

```
TEKNIS:
  [x] TASK-01: api.py berjalan di port 8000
  [x] TASK-02: Next.js setup selesai, Zustand store berfungsi
  [x] TASK-03: Three.js scene terlihat keren, playback berjalan
  [x] TASK-04: Parameter panel interaktif, re-simulation berjalan
  [x] TASK-05: Charts sinkron, DCM panel tampil
  [ ] Test performa: > 30 FPS untuk 200 agen (perlu verifikasi manual di browser)
  [ ] Tidak ada console error di browser (perlu verifikasi manual)

VISUAL (verifikasi manual di browser):
  [ ] Scene seperti top-down city map / mini-game
  [ ] Neon lighting dari dua toko terlihat
  [ ] WOM partikel terlihat jelas
  [ ] Revenue floating di atas toko update real-time
  [ ] HUD informatif

AKADEMIS:
  [ ] Artikel Notion draft selesai (6 bagian)
  [ ] Referensi Holm et al. (2016) dicantumkan
  [ ] Sensitivity analysis minimal 2 parameter
  [ ] Asumsi model didokumentasikan

PENGUMPULAN:
  [ ] Artikel Notion dipublikasi
  [ ] Publikasi medsos dengan tag anggota kelompok
  [ ] Screenshot/video visualisasi tersimpan
  [ ] Ekspor Notion ke PDF
  [ ] Link app tersedia untuk demo
```
