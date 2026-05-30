# PROGRESS.md — Status Progress

---

## Status Komponen Saat Ini

| Komponen | File | Status | Catatan |
|---|---|---|---|
| DCM estimation | `minimarket_abm/dcm.py` | 🔄 Dikerjakan tim | Jangan diubah |
| ABM engine | `minimarket_abm/main.py` | 🔄 Dikerjakan tim | Jangan diubah |
| Config | `minimarket_abm/config.py` | ✅ Selesai | Baca saja |
| **FastAPI backend** | `minimarket_abm/api.py` | ❌ Belum ada | **MULAI DI SINI — TASK-01** |
| **Next.js setup** | `parksim-frontend/` | ❌ Belum ada | TASK-02 |
| **Three.js scene** | `parksim-frontend/components/SimulationCanvas.tsx` | ❌ Belum ada | TASK-03 — INTI |
| **Parameter panel** | `parksim-frontend/components/ParameterPanel.tsx` | ❌ Belum ada | TASK-04 |
| **Charts + DCM** | `parksim-frontend/components/RevenueChart.tsx` | ❌ Belum ada | TASK-05 |

---

## Perubahan Stack Teknologi

**Sebelumnya (DIHAPUS):**
- ~~Streamlit~~ — diganti Next.js
- ~~p5.js~~ — diganti Three.js + @react-three/fiber
- ~~st.components.v1.html()~~ — tidak relevan
- ~~minimarket_animation.html~~ — tidak dibuat

**Sekarang:**
- **Backend:** Python (Mesa ABM + DCM) + FastAPI (port 8000)
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

---

## Dependencies yang Perlu Ditambahkan

### Python (`minimarket_abm/requirements.txt`)
```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
python-multipart
```

### Node.js (`parksim-frontend/package.json`)
```json
{
  "three": "^0.165.0",
  "@react-three/fiber": "^8.16.0",
  "@react-three/drei": "^9.105.0",
  "zustand": "^4.5.0",
  "recharts": "^2.12.0",
  "framer-motion": "^11.0.0"
}
```

---

## Cara Menjalankan (Development)

```bash
# Terminal 1 — Python backend
cd minimarket_abm
source env/bin/activate   # atau: env\Scripts\activate (Windows)
uvicorn api:app --reload --port 8000

# Terminal 2 — Next.js frontend
cd parksim-frontend
npm run dev
# Buka http://localhost:3000/simulation
```

---

## Checklist Sebelum Demo/Presentasi

```
TEKNIS:
  [ ] TASK-01: api.py berjalan, endpoint POST /api/simulate OK
  [ ] TASK-02: Next.js setup selesai, Zustand store berfungsi
  [ ] TASK-03: Three.js scene terlihat keren, playback berjalan
  [ ] TASK-04: Parameter panel interaktif, re-simulation berjalan
  [ ] TASK-05: Charts sinkron, DCM panel tampil
  [ ] Performa > 30 FPS untuk 200 agen

VISUAL:
  [ ] Scene seperti top-down city map / mini-game
  [ ] Neon lighting dari dua toko terlihat
  [ ] WOM partikel terlihat jelas
  [ ] Revenue floating di atas toko update real-time
  [ ] HUD informatif

AKADEMIS:
  [ ] Artikel Notion draft selesai
  [ ] Referensi Holm et al. (2016) dicantumkan
  [ ] Sensitivity analysis minimal 2 parameter

PENGUMPULAN:
  [ ] Artikel Notion dipublikasi
  [ ] Publikasi medsos
  [ ] Screenshot/video tersimpan
  [ ] PDF Notion
  [ ] Link app untuk demo
```
