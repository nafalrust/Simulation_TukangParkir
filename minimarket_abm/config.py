"""
config.py — Konfigurasi parameter ABM Minimarket
Semua nilai default bisa diubah di sini atau via slider Streamlit.

CATATAN ASUMSI:
Semua nilai default di bawah adalah asumsi yang defensible secara akademis.
Lihat komentar tiap parameter untuk penjelasan sumber asumsi dan
cara menggantinya dengan data lapangan.
"""

# ─────────────────────────────────────────────
# REPRODUCIBILITY
# ─────────────────────────────────────────────
RANDOM_SEED = 42

# ─────────────────────────────────────────────
# POPULASI & GEOGRAFI
# ─────────────────────────────────────────────

# Jumlah agen pelanggan dalam simulasi
# ASUMSI: 200 agen mewakili populasi aktif dalam radius pasar
# DATA ASLI: estimasi dari jumlah KK dalam radius 600m dari minimarket target
NUM_CUSTOMERS = 200

# Jarak antar dua minimarket (meter)
# ASUMSI: 500m — jarak umum antar minimarket kompetitor di kawasan perumahan
# DATA ASLI: ukur di Google Maps antara dua Alfamart/Indomaret yang dipilih
DISTANCE_BETWEEN_STORES = 500.0

# Radius pasar (meter) — area tempat pelanggan tersebar
# ASUMSI: 600m — radius jangkauan kaki/motor untuk minimarket
MARKET_RADIUS = 600.0

# ─────────────────────────────────────────────
# PERILAKU BELANJA
# ─────────────────────────────────────────────

# Probabilitas seorang pelanggan belanja pada suatu hari
# ASUMSI: 0.35 → rata-rata setiap pelanggan ke minimarket ~2–3x/minggu
# DATA ASLI: survei "berapa kali seminggu kamu ke minimarket?"
SHOPPING_NEED_PROBABILITY = 0.35

# Rata-rata nilai belanja per kunjungan (Rp)
# ASUMSI: Rp 25.000 — sesuai estimasi laporan tahunan Indomaret/Alfamart
# DATA ASLI: survei keluar toko (30–50 orang): "tadi belanja berapa?"
AVERAGE_SPENDING = 25_000

# ─────────────────────────────────────────────
# TUKANG PARKIR LIAR
# ─────────────────────────────────────────────

# Intensitas gangguan tukang parkir (0.0–1.0)
# 0.0 = jukir pasif/tidak mengganggu, 1.0 = sangat agresif/memaksa
# ASUMSI: 0.7 — jukir cukup aktif, menghampiri kendaraan
# DATA ASLI: observasi langsung + kategorisasi perilaku jukir
PARKING_INTENSITY = 0.7

# ─────────────────────────────────────────────
# PERSEPSI RISIKO & MEMORI
# ─────────────────────────────────────────────

# Persepsi risiko awal pelanggan terhadap toko A (ada jukir)
# ASUMSI: 0.05 — hampir tidak ada risiko awal, baru tumbuh dari pengalaman
INITIAL_RISK_A = 0.05

# Dampak langsung pengalaman buruk terhadap persepsi risiko
# ASUMSI: 0.35 — satu kejadian langsung → kenaikan persepsi risiko 35%
# Referensi: anchoring effect dari bad experience (behavioral economics)
DIRECT_EXPERIENCE_IMPACT = 0.35

# Laju peluruhan memori per hari (0.0–0.1)
# ASUMSI: 0.03 → persepsi risiko turun 3% per hari jika tidak ada insiden baru
MEMORY_DECAY = 0.03

# ─────────────────────────────────────────────
# WORD OF MOUTH (WOM)
# ─────────────────────────────────────────────

# Dampak cerita negatif dari teman terhadap persepsi risiko
# ASUMSI: 0.18 — pengalaman orang lain berpengaruh separuh dari pengalaman langsung
# DATA ASLI: survei "seberapa terpengaruh kamu oleh cerita teman soal parkir?"
WORD_OF_MOUTH_IMPACT = 0.18

# Probabilitas pelanggan berbagi cerita buruk ke temannya
# ASUMSI: 0.6 — 60% orang cerita ke minimal satu teman setelah kena jukir
# Referensi: studi WOM menunjukkan bad experience lebih sering dibagikan
# DATA ASLI: survei "apakah kamu pernah ceritakan pengalaman parkir ke teman?"
SHARE_PROBABILITY = 0.6

# Derajat sosial rata-rata (jumlah teman/tetangga tiap pelanggan dalam jaringan)
# ASUMSI: 6 — Dunbar's number reduced; kontak rutin di sekitar rumah
SOCIAL_DEGREE = 6

# ─────────────────────────────────────────────
# UTILITAS PEMILIHAN TOKO
# ─────────────────────────────────────────────

# Bobot jarak dalam fungsi utilitas (per meter)
# Makin besar = pelanggan makin sensitif terhadap jarak
DISTANCE_WEIGHT = 0.004

# Bobot risiko parkir dalam fungsi utilitas
# Makin besar = jukir makin berpengaruh pada keputusan toko
RISK_WEIGHT = 1.4

# Noise dalam pengambilan keputusan (randomness)
CHOICE_NOISE = 0.1

# ─────────────────────────────────────────────
# SIMULASI
# ─────────────────────────────────────────────
SIMULATION_DAYS = 60        # Durasi simulasi (hari)
NUM_REPLICATIONS = 5        # Replikasi untuk sensitivity analysis

# ─────────────────────────────────────────────
# BATAS SLIDER UI (Streamlit)
# ─────────────────────────────────────────────
UI = {
    "distance_min": 50.0,
    "distance_max": 1500.0,
    "distance_step": 50.0,
    "days_min": 10,
    "days_max": 180,
    "customers_min": 50,
    "customers_max": 500,
    "parking_intensity_min": 0.0,
    "parking_intensity_max": 1.0,
    "wom_impact_min": 0.0,
    "wom_impact_max": 0.5,
    "share_prob_min": 0.0,
    "share_prob_max": 1.0,
    "spending_min": 5_000,
    "spending_max": 100_000,
    "spending_step": 5_000,
}
