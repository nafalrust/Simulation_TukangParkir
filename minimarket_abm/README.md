# 🏪 MiniMarket ABM — Simulasi Word-of-Mouth Tukang Parkir Liar

Agent-Based Model (ABM) menggunakan **Mesa** untuk mensimulasikan bagaimana
tukang parkir liar di Toko A menyebabkan pelanggan berpindah ke Toko B
melalui efek **word-of-mouth**.

---

## Struktur File

```
minimarket_abm/
├── app.py          ← Streamlit interactive app (JALANKAN INI)
├── main.py         ← Core ABM model (Mesa)
├── visualize.py    ← Visualisasi matplotlib standalone (opsional)
├── config.py       ← Semua parameter & nilai default
├── requirements.txt
└── README.md
```

---

## Cara Setup & Menjalankan (dengan venv)

### Step 1 — Buat virtual environment

```bash
# Masuk ke folder project
cd minimarket_abm

# Buat venv bernama 'env'
python -m venv env
```

### Step 2 — Aktifkan venv

**Windows (CMD):**
```cmd
env\Scripts\activate
```

**Windows (PowerShell):**
```powershell
env\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
source env/bin/activate
```

Kalau berhasil, prompt terminal akan berubah jadi `(env) ...`

### Step 3 — Install dependensi

```bash
pip install -r requirements.txt
```

Tunggu hingga selesai. Akan menginstall: mesa, pandas, streamlit, plotly.

### Step 4 — Jalankan Streamlit app

```bash
streamlit run app.py
```

Browser akan terbuka otomatis di `http://localhost:8501`.
Kalau tidak terbuka, buka manual.

---

## Cara Menjalankan visualize.py (matplotlib desktop, opsional)

```bash
# Pastikan venv aktif
python visualize.py

# Dengan parameter custom:
python visualize.py --days 90 --parking-intensity 0.9 --customers 300

# Lihat semua opsi:
python visualize.py --help
```

## Cara Menjalankan main.py (CLI, tanpa visualisasi)

```bash
# Run standar
python main.py

# Run experiment jarak
python main.py --experiment

# Custom parameter:
python main.py --days 90 --customers 300 --seed 123
```

---

## Menonaktifkan venv

```bash
deactivate
```

---

## Parameter & Asumsi

### Parameter yang BISA DIASUMSI (nilai default sudah defensible)

| Parameter | Default | Alasan asumsi OK |
|-----------|---------|------------------|
| `average_spending` | Rp 25.000 | Sesuai estimasi laporan tahunan Indomaret/Alfamart |
| `shopping_need_probability` | 0.35 | ~2–3x kunjungan/minggu, wajar untuk minimarket |
| `parking_intensity` | 0.7 | Jukir aktif, menghampiri kendaraan |
| `word_of_mouth_impact` | 0.18 | Referensi behavioral economics: bad news travels fast |
| `share_probability` | 0.6 | 60% orang berbagi pengalaman buruk |
| `memory_decay` | 0.03 | Persepsi risiko memudar 3%/hari tanpa insiden baru |
| `direct_experience_impact` | 0.35 | Pengalaman langsung lebih kuat dari cerita |
| `initial_risk_a` | 0.05 | Persepsi risiko awal rendah — belum ada WOM |

### Parameter yang SEBAIKNYA DIUKUR

| Parameter | Cara mengukur |
|-----------|--------------|
| `distance_between_stores` | Ukur di Google Maps antara dua minimarket yang dipilih |
| `num_customers` | Estimasi jumlah KK dalam radius 600m (bisa dari data BPS kelurahan) |
| `average_spending` | Survei 30 orang: "tadi belanja berapa?" saat keluar toko |
| `share_probability` | Survei: "apakah kamu cerita ke teman setelah pengalaman buruk parkir?" |

### Untuk Validasi Model
Jalankan simulasi dengan parameter default, lalu:
1. Hitung kunjungan nyata ke Toko A vs Toko B selama 1–2 jam observasi
2. Bandingkan rasio kunjungan dengan output simulasi (kolom `Visits A / Visits B`)
3. Jika selisih < 20%, model valid untuk tujuan akademis

---

## Model: Agent-Based Model (ABM)

### Agen
- **CustomerAgent**: Memiliki posisi (x, y), `parking_aversion` [0.2–1.0],
  `social_susceptibility` [0.2–1.0], dan `perceived_risk_a` yang berkembang dinamis.

### Mekanisme Utama
1. **Utilitas toko**: `score = base_attractiveness - distance_weight×d - risk_weight×aversion×risk + noise`
2. **Pengalaman buruk**: Pelanggan di Toko A → P(bad experience) = `parking_intensity × aversion`
3. **Word-of-Mouth**: Yang kena bad experience cerita ke tetangga (social network random graph)
4. **Memori**: `perceived_risk_a *= (1 - memory_decay)` setiap hari — risiko memudar jika aman

### Output
- Kunjungan & revenue harian per toko
- Rata-rata persepsi risiko Toko A
- Jumlah bad experiences & WOM messages per hari

---

## Referensi

1. Axelrod, R. (1997). *The Complexity of Cooperation*. Princeton University Press.
2. Bonabeau, E. (2002). Agent-based modeling: Methods and techniques for simulating human systems. *PNAS*, 99(3), 7280–7287.
3. Mesa Documentation: https://mesa.readthedocs.io
4. [Tambahkan referensi lokal terkait perilaku konsumen minimarket Indonesia]
