"""
config.py — Konfigurasi utama simulasi parkir minimarket
Semua parameter bisa diubah di sini atau lewat UI Streamlit.
"""

# ─────────────────────────────────────────────
# REPRODUCIBILITY
# ─────────────────────────────────────────────
RANDOM_SEED = 42  # Ganti untuk trial berbeda; None = random setiap run

# ─────────────────────────────────────────────
# WAKTU SIMULASI
# ─────────────────────────────────────────────
SIM_DURATION_HOURS = 12        # Durasi simulasi (jam); default jam 07.00–19.00
WARM_UP_HOURS = 0.5            # Warm-up period sebelum statistik dikumpulkan (jam)
TIME_STEP_SECONDS = 60         # Resolusi animasi (detik per tick)

# ─────────────────────────────────────────────
# AREA PARKIR
# ─────────────────────────────────────────────
PARKING_CAPACITY = 20          # Total slot parkir yang tersedia
MOTOR_RATIO = 0.75             # Proporsi kendaraan motor (vs mobil)

# ─────────────────────────────────────────────
# KEDATANGAN KENDARAAN — Poisson Process
# λ (lambda) = rata-rata kedatangan per jam
# Non-homogeneous: λ berbeda per periode waktu
# ─────────────────────────────────────────────
ARRIVAL_RATES = {
    # jam_mulai: lambda (kendaraan/jam)
    7:  8,    # Pagi awal — sepi
    9:  15,   # Pagi menengah
    11: 22,   # Menjelang siang — mulai ramai
    13: 18,   # Setelah jam makan siang
    15: 20,   # Sore awal
    17: 25,   # Jam pulang kerja — paling ramai
    19: 10,   # Malam awal
    21: 6,    # Malam — mulai sepi
}

# ─────────────────────────────────────────────
# DURASI PARKIR / BELANJA — Lognormal Distribution
# Satuan: menit
# ─────────────────────────────────────────────
PARKING_DURATION_MEAN = 15.0       # Rata-rata durasi parkir (menit)
PARKING_DURATION_STD  = 8.0        # Standar deviasi (menit)
PARKING_DURATION_MIN  = 2.0        # Minimum (beli rokok / bayar token)
PARKING_DURATION_MAX  = 90.0       # Maksimum (belanja bulanan kecil)

# ─────────────────────────────────────────────
# SPENDING PER KUNJUNGAN — Normal Distribution (dipotong di bawah)
# Satuan: Rupiah
# ─────────────────────────────────────────────
SPENDING_MEAN_MOTOR = 35_000       # Rata-rata belanja pengendara motor
SPENDING_STD_MOTOR  = 20_000
SPENDING_MEAN_MOBIL = 85_000       # Rata-rata belanja pengendara mobil
SPENDING_STD_MOBIL  = 45_000
SPENDING_MIN        = 5_000        # Batas bawah (minimal pembelian)

# Margin keuntungan toko (untuk hitung revenue bersih)
STORE_MARGIN = 0.22                # 22% margin — estimasi minimarket Indonesia

# ─────────────────────────────────────────────
# PERILAKU BALKING (menolak masuk)
# p_balk = probabilitas kendaraan pergi tanpa parkir
# ─────────────────────────────────────────────

# Skenario TANPA tukang parkir
BALK_BASE_NO_JUKIR = 0.10          # Balking dasar tanpa jukir (kapasitas penuh)
BALK_THRESHOLD_NO_JUKIR = 0.70     # Mulai balk saat parkiran >= 70% penuh

# Skenario DENGAN tukang parkir
BALK_BASE_WITH_JUKIR = 0.25        # Balking dasar dengan jukir (kapasitas penuh)
BALK_THRESHOLD_WITH_JUKIR = 0.60   # Mulai balk lebih awal karena risiko dimintai uang
BALK_JUKIR_IDLE = 0.08             # Balking ekstra saat parkiran < 30% — ada jukir = tetap was-was

# ─────────────────────────────────────────────
# TUKANG PARKIR
# ─────────────────────────────────────────────
JUKIR_TARIF_MOTOR = 2_000          # Tarif parkir motor (Rp)
JUKIR_TARIF_MOBIL = 5_000          # Tarif parkir mobil (Rp)
JUKIR_START_HOUR  = 8              # Jukir mulai beroperasi
JUKIR_END_HOUR    = 20             # Jukir selesai beroperasi

# ─────────────────────────────────────────────
# ANIMASI & VISUALISASI
# ─────────────────────────────────────────────
ANIMATION_SPEED = 1.0              # Multiplier kecepatan animasi (1.0 = normal)
CHART_HISTORY_MINUTES = 60         # Panjang window rolling chart (menit simulasi)

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
DUMMY_DATA_PATH = "data/dummy_data.csv"
LOG_OUTPUT_PATH = "data/simulation_log.csv"
