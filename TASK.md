# TASK.md — Task Breakdown

> Tugas di sesi ini: komponen visualisasi p5.js saja.
> Jangan modifikasi `main.py`, `dcm.py`, atau logika simulasi apapun.

---

## TASK-01 (UTAMA): Buat `minimarket_animation.html`

**File yang dibuat:** `minimarket_abm/components/minimarket_animation.html`

Implementasi lengkap sudah ada di `VISUALIZATION.md` — gunakan kode di sana sebagai basis, lalu sesuaikan dan test.

**Langkah yang disarankan:**
1. Copy implementasi dari VISUALIZATION.md
2. Buka di browser standalone — pastikan data dummy ter-load dan animasi berjalan
3. Cek semua acceptance criteria di bawah sebelum lanjut ke TASK-02

**Acceptance criteria TASK-01:**
- [ ] Animasi berjalan di browser standalone dengan data dummy
- [ ] Panel kiri (peta agen) menampilkan titik berwarna dengan dua toko
- [ ] Panel kanan (chart) tumbuh per hari saat playback
- [ ] HUD bawah menampilkan stats hari yang sedang ditampilkan
- [ ] Tombol Play/Pause mengubah state dengan benar
- [ ] Tombol ◀◀ kembali ke hari 1
- [ ] Tombol ▶▶ langsung ke hari terakhir dan pause
- [ ] Slider "Hari" bisa di-scrub maju mundur
- [ ] Slider Speed mengubah kecepatan playback
- [ ] Tidak ada console error di browser

---

## TASK-02: Integrasi ke `app.py`

**File yang dimodifikasi:** `minimarket_abm/app.py`

Tambahkan fungsi `render_abm_animation()` dan panggil setelah simulasi selesai.

```python
# Tambahkan import di bagian atas app.py
from pathlib import Path
import json
import streamlit.components.v1 as components

# Tambahkan fungsi ini
def render_abm_animation(abm_daily, agent_snapshots, dcm_results, sim_config):
    template = (
        Path(__file__).parent / "components" / "minimarket_animation.html"
    ).read_text(encoding="utf-8")

    if len(agent_snapshots) > 500:
        import random; random.seed(42)
        agent_snapshots = random.sample(agent_snapshots, 500)

    html = template \
        .replace("'__ABM_DAILY__'",  json.dumps(abm_daily)) \
        .replace("'__AGENTS__'",     json.dumps(agent_snapshots)) \
        .replace("'__DCM__'",        json.dumps(dcm_results)) \
        .replace("'__CONFIG__'",     json.dumps(sim_config))

    components.html(html, height=600, scrolling=False)

# Panggil di section hasil simulasi, setelah st.session_state.ran == True:
# st.markdown("### 🎬 Animasi Dinamika Pelanggan")
# render_abm_animation(
#     st.session_state.abm_daily,
#     st.session_state.agent_snapshots,
#     st.session_state.dcm_results,
#     st.session_state.sim_config
# )
```

**Catatan penting:**
- Jika nama variabel output dari `main.py` berbeda dari yang ada di `MODEL_INTEGRATION.md`, lakukan konversi/mapping di `app.py` — jangan ubah `main.py`
- Pastikan `main.py` mengembalikan `agent_snapshots` (state agen di hari terakhir) dan `abm_daily` (list stats per hari) — jika belum ada, tanyakan ke anggota tim yang mengerjakan simulasi

**Acceptance criteria TASK-02:**
- [ ] Animasi muncul di Streamlit setelah klik "Jalankan Simulasi"
- [ ] Data simulasi aktual ter-inject dengan benar (bukan dummy)
- [ ] Tidak ada error di terminal saat `render_abm_animation()` dipanggil
- [ ] Komponen tidak menampilkan scrollbar horizontal

---

## TASK-03: Panel Hasil DCM di `app.py`

Tambahkan section ringkasan hasil estimasi DCM — ditampilkan setelah animasi.

```python
def render_dcm_summary(dcm_results: dict):
    st.markdown("### 📊 Hasil Estimasi DCM")

    col1, col2, col3 = st.columns(3)
    col1.metric(
        "β Jarak",
        f"{dcm_results['beta_jarak']:.4f}",
        help="Koefisien utilitas jarak. Negatif = makin jauh makin tidak disukai."
    )
    col2.metric(
        "β Ada Jukir",
        f"{dcm_results['beta_parkir']:.4f}",
        help="Koefisien keberadaan jukir. Negatif = jukir menurunkan utilitas konsumen."
    )
    col3.metric(
        "McFadden R²",
        f"{dcm_results['pseudo_r2']:.3f}",
        help="Ukuran goodness-of-fit model DCM. Nilai >0.2 menunjukkan fit yang baik."
    )

    st.caption(
        f"Diestimasi dari **{dcm_results['n_respondents']} responden**. "
        f"Log-likelihood: {dcm_results['log_likelihood']:.1f}. "
        f"p-value β_jarak: {dcm_results['p_value_jarak']:.3f}, "
        f"p-value β_parkir: {dcm_results['p_value_parkir']:.3f}."
    )
```

**Acceptance criteria TASK-03:**
- [ ] Tiga metric card tampil dengan benar
- [ ] Tooltip informatif muncul saat hover
- [ ] Caption menampilkan n_respondents dan log-likelihood

---

## Urutan Pengerjaan

```
TASK-01 (standalone test) → TASK-02 (integrasi Streamlit) → TASK-03 (panel DCM)
```

**Jangan lanjut ke TASK-02 sebelum TASK-01 lolos semua acceptance criteria.**
