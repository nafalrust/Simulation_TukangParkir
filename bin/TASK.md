# TASK.md — Task Breakdown

> Tugas: bangun visualisasi Three.js (Next.js) yang terlihat SANGAT KEREN — seperti mini-game kota.
> Jangan modifikasi `main.py`, `dcm.py`, atau logika simulasi Python apapun.

---

## Urutan Pengerjaan

```
TASK-01 (Backend API)
  → TASK-02 (Next.js Setup + Store)
    → TASK-03 (Three.js Scene)
      → TASK-04 (Interaktivitas Parameter)
        → TASK-05 (Charts + DCM Panel)
```

---

## TASK-01: Buat `api.py` — FastAPI Backend

**File yang dibuat:** `minimarket_abm/api.py`

Expose hasil simulasi Python sebagai REST API yang bisa diakses Next.js.

**Yang harus dikerjakan:**
1. Install FastAPI + uvicorn: tambahkan ke `requirements.txt`
2. Buat `api.py` dengan endpoint `POST /api/simulate`
3. Mapping parameter dari request body ke `MiniMarket()` (lihat `config.py` dan `main.py` untuk nama parameter)
4. Konversi output `history` DataFrame dan state agen ke format JSON sesuai `MODEL_INTEGRATION.md`
5. Enable CORS untuk `http://localhost:3000`

**Acceptance criteria TASK-01:**
- [ ] `uvicorn api:app --reload` berjalan tanpa error
- [ ] POST ke `/api/simulate` dengan body JSON mengembalikan response dengan 4 key: `abm_daily`, `agent_snapshots`, `dcm_results`, `sim_config`
- [ ] Semua field dalam response sesuai tipe data di `MODEL_INTEGRATION.md`
- [ ] CORS header ada di response (test dari browser / curl)

---

## TASK-02: Setup Next.js Project + Zustand Store

**Direktori baru:** `parksim-frontend/`

```bash
npx create-next-app@14 parksim-frontend \
  --typescript --tailwind --eslint --app --no-src-dir
cd parksim-frontend
npm install three @react-three/fiber @react-three/drei zustand recharts framer-motion
```

**Yang harus dikerjakan:**
1. Buat struktur direktori sesuai `CLAUDE.md`
2. Buat `lib/simulationStore.ts` — Zustand store (lihat `ARCHITECTURE.md` untuk interface)
3. Buat `lib/api.ts` — fetch wrapper ke `http://localhost:8000/api/simulate`
4. Buat `app/simulation/page.tsx` — halaman utama, layout 2-panel (canvas + sidebar)
5. Test: `npm run dev` berjalan, halaman `/simulation` terbuka

**Acceptance criteria TASK-02:**
- [ ] `npm run dev` tidak ada TypeScript error
- [ ] `useSimulationStore()` bisa diakses dari komponen manapun
- [ ] `runSimulation()` di store berhasil fetch data dari backend dan mengisi state
- [ ] Loading state dan error state ter-handle

---

## TASK-03: Three.js Scene — INTI VISUALISASI

**File utama:** `parksim-frontend/components/SimulationCanvas.tsx`

Ini adalah tugas paling penting. Scene harus terlihat seperti top-down city map mini-game.

**Yang harus dikerjakan:**
1. **Ground + Lighting** — aspal gelap, grid subtle, neon lighting dari dua toko
2. **StoreBuilding** — bangunan 3D dengan papan neon + floating revenue display
3. **JukirFigure** — figur humanoid di depan Toko A yang bergerak mondar-mandir
4. **AgentLayer** — sphere per agen, warna berdasarkan pilihan, ukuran ∝ |memory_a|
5. **BadExperienceRing** — ring kuning berdenyut pada agen yang kena bad experience
6. **WOMParticleSystem** — percikan cahaya kuning saat WOM terjadi
7. **HUD overlay** — div HTML di atas canvas, stats real-time
8. **Playback logic** — frame advance di `useFrame`, sinkronisasi dengan Zustand store
9. **OrbitControls** — user bisa rotate/zoom scene

**Detail teknis kritis:**
- Gunakan `instancedMesh` untuk agen (bukan N mesh terpisah) jika > 200 agen, untuk performa
- Koordinat: sim_x → three_x, sim_y → three_z (Y adalah vertikal di Three.js)
- Revenue display update setiap frame berganti hari (bukan setiap render frame)
- WOM partikel: spawn saat `dayData.wom_messages > 0`, mati setelah 1.5 detik

**Acceptance criteria TASK-03:**
- [ ] Scene ter-render di browser tanpa error console
- [ ] Dua bangunan toko terlihat jelas dengan neon berbeda warna
- [ ] Agen muncul sebagai sphere berwarna di posisi yang benar
- [ ] Animasi playback berjalan: warna agen berubah per hari
- [ ] Revenue display di atas toko update setiap hari
- [ ] WOM menghasilkan efek partikel visual
- [ ] OrbitControls berfungsi (drag = rotate, scroll = zoom)
- [ ] HUD menampilkan stats hari yang sedang ditampilkan
- [ ] Tombol Play/Pause, ⏮, ⏭ berfungsi
- [ ] Day scrubber (slider) bisa di-drag untuk scrub ke hari tertentu
- [ ] Speed slider mengubah kecepatan playback

---

## TASK-04: Parameter Panel + Real-time Re-simulation

**File:** `parksim-frontend/components/ParameterPanel.tsx`

User harus bisa mengubah parameter dan melihat efeknya — ini adalah core requirement tugas.

**Yang harus dikerjakan:**
1. Semua slider parameter (lihat `VISUALIZATION.md` untuk daftar)
2. Tombol "▶ Jalankan Simulasi" yang trigger fetch ke backend
3. Loading indicator yang jelas saat simulasi sedang berjalan
4. Tooltip informatif di setiap slider (jelaskan apa efek parameter ini)
5. Reset ke default values

**Bonus (jika sempat):**
- Debounce auto-rerun saat slider berubah (500ms delay)
- Compare mode: jalankan dua set parameter, overlay hasilnya

**Acceptance criteria TASK-04:**
- [ ] Semua slider berfungsi dan mengubah state Zustand
- [ ] Klik "Jalankan" → loading state → scene update dengan data baru
- [ ] Tooltip muncul saat hover slider
- [ ] Error ditampilkan dengan jelas jika backend tidak bisa dihubungi

---

## TASK-05: Charts + DCM Results Panel

**File:** `parksim-frontend/components/RevenueChart.tsx`

**Yang harus dikerjakan:**
1. **Kunjungan Harian** — line chart, garis A merah + garis B hijau + avg_memory_a ungu (putus)
2. **Revenue Kumulatif** — area chart, chart tumbuh seiring playback (hanya tampilkan hingga frame saat ini)
3. **WOM & Bad Exp** — bar chart harian
4. **DCM Results Panel** — 3 metric card: β Jarak, β Jukir, McFadden R²
5. Chart sinkron dengan playback — hanya tampilkan data hingga `currentFrame`

**Acceptance criteria TASK-05:**
- [ ] Chart muncul di bawah canvas
- [ ] Data chart sinkron dengan hari yang sedang diputar di animasi
- [ ] DCM panel tampil dengan benar
- [ ] Tooltip chart informatif (angka + satuan)

---

## Checklist Sebelum Demo/Presentasi

```
TEKNIS:
  [ ] TASK-01: Backend API berjalan di port 8000
  [ ] TASK-02: Frontend berjalan di port 3000
  [ ] TASK-03: Three.js scene terlihat keren dan berjalan smooth
  [ ] TASK-04: Parameter bisa diubah dan simulasi re-run
  [ ] TASK-05: Charts dan DCM panel tampil
  [ ] Tidak ada console error di browser
  [ ] Performa: > 30 FPS untuk 200 agen

VISUAL (acceptance criteria utama):
  [ ] Scene terlihat seperti top-down city map, bukan grafik 2D biasa
  [ ] Neon lighting dari dua toko terlihat jelas
  [ ] Gerakan agen terlihat hidup (smooth, ada easing)
  [ ] WOM partikel terlihat dan bisa dibedakan dari agen
  [ ] Revenue display di atas toko terbaca jelas
  [ ] HUD informatif tapi tidak menutupi scene
  [ ] User bisa explore scene dengan mouse (orbit, zoom)

AKADEMIS:
  [ ] Artikel Notion draft selesai (6 bagian)
  [ ] Referensi Holm et al. (2016) dicantumkan
  [ ] Asumsi model didokumentasikan
  [ ] Sensitivity analysis minimal 2 parameter

PENGUMPULAN:
  [ ] Artikel Notion dipublikasi
  [ ] Publikasi medsos dengan tag anggota kelompok
  [ ] Screenshot/video visualisasi tersimpan
  [ ] Ekspor Notion ke PDF
  [ ] Link app tersedia untuk demo
```
