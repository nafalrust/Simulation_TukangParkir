# 🅿️ ParkSim — Simulasi Parkir Minimarket

**Proyek Pemodelan & Simulasi Stokastik**
Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket

---

## Struktur Proyek

```
parkir_sim/
├── app.py              ← Streamlit interactive app (MAIN)
├── simulation.py       ← Engine DES (SimPy)
├── config.py           ← Semua parameter & seed
├── requirements.txt    ← Dependensi Python
├── README.md           ← Dokumentasi ini
└── data/
    ├── dummy_data.py   ← Generator dummy data + panduan data asli
    ├── dummy_arrival.csv   ← (generated)
    ├── dummy_duration.csv  ← (generated)
    ├── dummy_balking.csv   ← (generated)
    └── dummy_spending.csv  ← (generated)
```

---

## Setup & Cara Menjalankan

### 1. Install dependensi
```bash
pip install -r requirements.txt
```

### 2. (Opsional) Generate dummy data
```bash
cd parkir_sim
python data/dummy_data.py
```

### 3. Test simulasi via CLI
```bash
python simulation.py
```

### 4. Jalankan Streamlit app
```bash
streamlit run app.py
```
Buka browser di `http://localhost:8501`

---

## Model Matematika

### Arrival Process
Non-homogeneous Poisson Process dengan λ yang berubah per jam:

```
N(t) ~ Poisson(λ(t))
λ(t) = {8 jika 07≤t<09, 15 jika 09≤t<11, 22 jika 11≤t<13, ...}
```

### Durasi Parkir
Lognormal distribution:
```
D ~ LogNormal(μ_ln, σ_ln)
  dimana μ_ln = ln(mean) - σ²/2
         σ_ln = √(ln(1 + (std/mean)²))
```

### Spending per Kunjungan
Truncated Normal:
```
S ~ TruncNormal(mean, std, min=5000)
  Motor: mean=35.000, std=20.000
  Mobil: mean=85.000, std=45.000
```

### Balking Probability
```
p_balk(occ, scenario, t) =
  Tanpa Jukir: max(0, BASE × (occ% - threshold%) / (1 - threshold%))
  Dengan Jukir: BASE_IDLE + BASE × (occ% - threshold%) / (1 - threshold%)
    dimana BASE_IDLE = 0.08 saat parkiran < 30%
```

### Revenue Toko
```
Revenue = Σ spending_i × margin_toko
  dimana margin_toko ≈ 22%
```

---

## Parameter Utama (config.py)

| Parameter | Default | Keterangan |
|-----------|---------|------------|
| `RANDOM_SEED` | 42 | Seed reproducibility |
| `SIM_DURATION_HOURS` | 12 | Jam 07:00–19:00 |
| `PARKING_CAPACITY` | 20 | Jumlah slot parkir |
| `MOTOR_RATIO` | 0.75 | 75% kendaraan adalah motor |
| `PARKING_DURATION_MEAN` | 15 menit | Rata-rata durasi parkir |
| `BALK_BASE_NO_JUKIR` | 0.10 | Maks balking tanpa jukir |
| `BALK_BASE_WITH_JUKIR` | 0.25 | Maks balking dengan jukir |
| `STORE_MARGIN` | 0.22 | Margin keuntungan minimarket |

---

## Data yang Harus Dikumpulkan (untuk validasi)

### Blok A — Kedatangan Kendaraan
- **Format**: tanggal, jam, interval 15 menit, jumlah kendaraan, ada/tidak jukir
- **Minimal**: 3 hari × 4 sesi
- **Untuk**: fitting distribusi Poisson, estimasi λ per jam

### Blok B — Durasi Parkir
- **Format**: id kendaraan, waktu masuk, waktu keluar, jenis kendaraan
- **Minimal**: 50 observasi per kondisi
- **Untuk**: fitting Lognormal, estimasi μ dan σ

### Blok C — Balking (PALING KRITIS)
- **Format**: jam, total mendekat, total masuk, total pergi, % okupansi
- **Minimal**: observasi 2 kondisi (ada/tidak jukir)
- **Tips**: butuh 2 observer; posisi harus bisa lihat dari jalan

### Blok D — Spending
- **Format**: jenis kendaraan, nominal belanja
- **Minimal**: 30–50 responden (survei keluar toko)
- **Untuk**: fitting distribusi spending, estimasi mean & std

### Blok E — Profil Jukir
- **Format**: jam mulai/selesai, tarif motor/mobil, tipe (resmi/liar)
- **Untuk**: validasi asumsi jam operasi dan tarif

---

## Sensitivity Analysis

Di sidebar Streamlit app, tersedia slider untuk:
- **Arrival Rate ×** — lipat gandakan λ kedatangan
- **Balking Rate ×** — perkuat/lemahkan probabilitas balking  
- **Spending ×** — kalikan nominal belanja

Gunakan ini untuk sensitivity analysis dan eksplorasi "what-if".

---

## Anggota Kelompok

1. [Nama 1] — [NIM]
2. [Nama 2] — [NIM]
3. [Nama 3] — [NIM]

---

## Referensi

1. Banks, J. et al. (2010). *Discrete-Event System Simulation* (5th ed.). Prentice Hall.
2. Law, A. M. (2015). *Simulation Modeling and Analysis* (5th ed.). McGraw-Hill.
3. SimPy Documentation: https://simpy.readthedocs.io
4. [Tambahkan referensi jurnal terkait balking/parkir liar di Indonesia]
