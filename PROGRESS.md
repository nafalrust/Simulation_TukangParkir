# PROGRESS.md — Status Progress

---

## Status Komponen Saat Ini

| Komponen | File | Status | Catatan |
|---|---|---|---|
| DCM estimation | `dcm.py` | 🔄 Dikerjakan tim | Jangan diubah |
| ABM engine | `main.py` | 🔄 Dikerjakan tim | Jangan diubah |
| Streamlit app | `app.py` | ⚠️ Partial | Perlu tambah `render_abm_animation()` |
| **Animasi p5.js** | `components/minimarket_animation.html` | ❌ Belum ada | **MULAI DI SINI — TASK-01** |
| Panel DCM summary | `app.py` | ❌ Belum | TASK-03 |

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

## Checklist Sebelum Demo/Presentasi

```
TEKNIS:
  [ ] TASK-01: minimarket_animation.html standalone berjalan
  [ ] TASK-02: animasi muncul di Streamlit dengan data aktual
  [ ] TASK-03: panel DCM summary tampil
  [ ] requirements.txt up-to-date (tambahkan dependencies baru jika ada)

AKADEMIS:
  [ ] Artikel Notion draft selesai (6 bagian)
  [ ] Referensi Holm et al. (2016) dicantumkan sebagai justifikasi ABM+DCM
  [ ] Asumsi model didokumentasikan
  [ ] Sensitivity analysis minimal 2 parameter

PENGUMPULAN:
  [ ] Artikel Notion dipublikasi
  [ ] Publikasi medsos dengan tag anggota kelompok
  [ ] Screenshot publikasi medsos tersimpan
  [ ] Ekspor Notion ke PDF
  [ ] Link Notion disiapkan untuk text submission
```
