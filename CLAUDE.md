# CLAUDE.md — Konteks Proyek ParkSim

> Baca file ini PERTAMA sebelum file lain.
> Urutan baca: CLAUDE.md → MODEL_INTEGRATION.md → ARCHITECTURE.md → VISUALIZATION.md → TASK.md → PROGRESS.md

---

## Identitas Proyek

**Nama:** ParkSim — Simulasi Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket
**Mata kuliah:** Teknik Pemodelan dan Simulasi (TPS), DTETI UGM 2025
**Deliverable:** Interactive Streamlit app + artikel Notion + publikasi media sosial

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
Simulasi (dikerjakan anggota tim lain — JANGAN DIMODIFIKASI):
  Python 3.11+
  Mesa >= 2.3.0        # ABM engine
  statsmodels / numpy  # MNL estimation untuk DCM
  pandas

Visualisasi (TUGAS UTAMA CLAUDE CODE):
  Streamlit >= 1.35.0
  p5.js 1.9.0 via CDN  # animasi utama
  Plotly >= 5.22.0     # chart pendukung (sudah ada di app.py)
  streamlit.components.v1.html()  # cara embed p5.js
```

---

## Struktur Direktori

```
Simulation_TukangParkir/
│
├── CLAUDE.md                        ← File ini (baca pertama)
├── MODEL_INTEGRATION.md             ← Pipeline DCM+ABM, format data
├── ARCHITECTURE.md                  ← Struktur data, layout canvas
├── VISUALIZATION.md                 ← Spesifikasi lengkap animasi p5.js
├── TASK.md                          ← Task breakdown + acceptance criteria
├── PROGRESS.md                      ← Status progress dan mapping parameter
│
└── minimarket_abm/
    ├── main.py                      ← ABM engine Mesa (JANGAN DIUBAH)
    ├── dcm.py                       ← DCM estimation (JANGAN DIUBAH)
    ├── config.py                    ← Parameter simulasi (BACA SAJA)
    ├── app.py                       ← Streamlit app (TAMBAHKAN fungsi animasi)
    ├── requirements.txt
    └── components/
        └── minimarket_animation.html  ← BUAT FILE INI (tugas utama)
```

---

## Aturan untuk Claude Code

### DO ✅
- Fokus pada `components/minimarket_animation.html` dan integrasi ke `app.py`
- Test animasi standalone dengan data dummy sebelum integrasi
- Inject data Python → JavaScript via `json.dumps()` + `str.replace()`
- Gunakan `st.components.v1.html(html_string, height=600)` untuk embed
- Pertahankan dark background (#0f172a) dan color palette dari ARCHITECTURE.md

### DON'T ❌
- Jangan modifikasi `main.py` atau `dcm.py`
- Jangan gunakan WebSocket, REST API, atau komunikasi real-time
- Jangan hardcode data simulasi di HTML — selalu inject dari Python
- Jangan gunakan `localStorage` atau `sessionStorage`
- Jangan tambahkan library p5.js selain dari CDN yang sudah ditentukan

---

## Cara Menjalankan

```bash
cd minimarket_abm
python -m venv env
source env/bin/activate   # Windows: env\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```
