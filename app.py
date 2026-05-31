"""
app.py — ParkSim Streamlit App
Simulasi Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket
Menggunakan BaselineMiniMarket dari baseline.py
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from baseline import BaselineMiniMarket, MARKET_RADIUS

# ─────────────────────────────────────────────────────────────────────────────
# Page config
# ─────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="ParkSim — Simulasi Tukang Parkir Liar",
    page_icon="🏪",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
html, body, [class*="css"] { font-family: 'IBM Plex Sans', sans-serif; }
.title-block {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
    border-radius: 14px; padding: 1.4rem 1.8rem; margin-bottom: 1.2rem;
    border-left: 4px solid #3b82f6;
}
.title-main {
    font-family: 'IBM Plex Mono', monospace; font-size: 1.6rem;
    font-weight: 600; color: #f8fafc; margin: 0;
}
.title-sub { color: #94a3b8; font-size: 0.85rem; margin-top: 0.3rem; }
</style>
""", unsafe_allow_html=True)

st.markdown("""
<div class="title-block">
  <p class="title-main">🏪 ParkSim — Simulasi Tukang Parkir Liar</p>
  <p class="title-sub">
    Agent-Based Model · DCM Utility · Word-of-Mouth Dynamics<br>
    Teknik Pemodelan dan Simulasi (TPS) · DTETI UGM 2025
  </p>
</div>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# Sidebar — Parameter Simulasi
# ─────────────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.header("⚙️ Parameter Simulasi")

    st.subheader("Populasi & Waktu")
    num_customers = st.slider("Jumlah Pelanggan", 50, 500, 200, 10)
    days          = st.slider("Lama Simulasi (hari)", 10, 120, 60, 5)
    seed          = st.number_input("Random Seed", value=42, step=1)

    st.subheader("Parameter Toko")
    parking_fee   = st.slider("Biaya Parkir Liar (Rp)", 0, 10_000, 2_000, 500)
    distance_to_B = st.slider("Jarak ke Toko B (meter)", 50, 2000, 1000, 50)

    st.subheader("Daya Tarik Toko")
    attractiveness_A = st.slider("Attractiveness Toko A", 0.0, 1.0, 0.5, 0.05)
    attractiveness_B = st.slider("Attractiveness Toko B", 0.0, 1.0, 0.5, 0.05)

    st.subheader("Parameter Agen")
    parking_aversion = st.slider("Rata-rata Parking Aversion", 0.0, 1.0, 0.4, 0.05)
    memory_strength  = st.slider("Memory Strength", 0.0, 0.5, 0.1, 0.01)

    st.subheader("Word of Mouth")
    wom_probability = st.slider("WOM Probability", 0.0, 1.0, 0.3, 0.05)
    wom_strength    = st.slider("WOM Strength", 0.0, 0.3, 0.05, 0.01)
    num_contacts    = st.slider("Jumlah Kontak WOM", 1, 10, 3)

    st.subheader("Koefisien DCM (β)")
    st.caption("Nilai ini akan diganti hasil estimasi DCM dari data survei.")
    beta_distance  = st.slider("β Jarak", -3.0, 0.0, -1.0, 0.1)
    beta_parking   = st.slider("β Keberadaan Jukir", -3.0, 0.0, -1.0, 0.1)
    beta_fee_ratio = st.slider("β Rasio Biaya/Belanja", -5.0, 0.0, -2.0, 0.1)

    st.divider()
    run_button = st.button("▶ Jalankan Simulasi", type="primary", use_container_width=True)

# ─────────────────────────────────────────────────────────────────────────────
# Helper: konversi output baseline → format animasi
# ─────────────────────────────────────────────────────────────────────────────

def build_abm_daily(history: pd.DataFrame) -> list[dict]:
    """Konversi DataFrame DataCollector → list dict abm_daily."""
    records = []
    for day_idx, row in history.iterrows():
        records.append({
            "day":                  int(day_idx) + 1,
            "visits_a":             int(row.get("Visits A", 0)),
            "visits_b":             int(row.get("Visits B", 0)),
            "no_buy":               0,
            "bad_experiences":      int(row.get("Negative Experiences", 0)),
            "wom_messages":         int(row.get("WOM Messages", 0)),
            "avg_parking_aversion": float(row.get("Avg Parking Aversion", 0)),
            "revenue_a":            int(row.get("Revenue A", 0)),
            "revenue_b":            int(row.get("Revenue B", 0)),
        })
    return records


def build_agent_snapshots(model: BaselineMiniMarket) -> list[dict]:
    """Ambil state agen di hari terakhir dari model."""
    snapshots = []
    for ag in model.customers:
        snapshots.append({
            "id":                    ag.unique_id,
            "x":                     float(ag.x),
            "y":                     float(ag.y),
            "choice":                ag.choice if ag.choice else "none",
            "parking_aversion":      float(ag.parking_aversion),
            "had_negative_experience": bool(ag.had_negative_experience),
        })
    return snapshots


def build_sim_config(model: BaselineMiniMarket, n_days: int) -> dict:
    return {
        "n_agents":      len(model.customers),
        "n_days":        n_days,
        "market_radius": MARKET_RADIUS,
        "store_a_x":     float(model.store_a.x),
        "store_a_y":     float(model.store_a.y),
        "store_b_x":     float(model.store_b.x),
        "store_b_y":     float(model.store_b.y),
    }


def build_dcm_results(model: BaselineMiniMarket) -> dict:
    """Ringkasan parameter DCM yang digunakan model."""
    return {
        "beta_distance":     model.beta_distance,
        "beta_parking":      model.beta_parking,
        "beta_fee_ratio":    model.beta_fee_ratio,
        "attractiveness_A":  model.attractiveness_A,
        "attractiveness_B":  model.attractiveness_B,
        "parking_fee":       model.parking_fee,
        "distance_to_B":     model.distance_to_B,
    }

# ─────────────────────────────────────────────────────────────────────────────
# Fungsi render animasi p5.js
# ─────────────────────────────────────────────────────────────────────────────

def render_abm_animation(abm_daily: list, agent_snapshots: list,
                          dcm_results: dict, sim_config: dict) -> None:
    template_path = Path(__file__).parent / "components" / "minimarket_animation.html"
    template = template_path.read_text(encoding="utf-8")

    if len(agent_snapshots) > 500:
        random.seed(42)
        agent_snapshots = random.sample(agent_snapshots, 500)

    html = (template
        .replace("'__ABM_DAILY__'", json.dumps(abm_daily))
        .replace("'__AGENTS__'",    json.dumps(agent_snapshots))
        .replace("'__DCM__'",       json.dumps(dcm_results))
        .replace("'__CONFIG__'",    json.dumps(sim_config)))

    components.html(html, height=530, scrolling=False)

# ─────────────────────────────────────────────────────────────────────────────
# Render panel ringkasan DCM
# ─────────────────────────────────────────────────────────────────────────────

def render_dcm_summary(dcm: dict) -> None:
    st.markdown("### 📊 Parameter DCM yang Digunakan")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("β Jarak", f"{dcm['beta_distance']:.2f}",
              help="Koefisien utilitas jarak. Negatif = makin jauh makin tidak disukai.")
    c2.metric("β Jukir", f"{dcm['beta_parking']:.2f}",
              help="Koefisien keberadaan jukir. Negatif = jukir menurunkan utilitas.")
    c3.metric("β Rasio Biaya", f"{dcm['beta_fee_ratio']:.2f}",
              help="Pengaruh rasio biaya parkir terhadap nominal belanja.")
    c4.metric("Biaya Parkir", f"Rp{dcm['parking_fee']:,}",
              help="Biaya yang dipungut jukir liar per kunjungan ke Toko A.")
    st.caption(
        f"Attractiveness A = {dcm['attractiveness_A']:.2f} · "
        f"Attractiveness B = {dcm['attractiveness_B']:.2f} · "
        f"Jarak ke Toko B = {dcm['distance_to_B']:.0f} m. "
        "⚠️ Nilai β saat ini adalah default — akan diganti hasil estimasi DCM dari data survei."
    )

# ─────────────────────────────────────────────────────────────────────────────
# Render chart Plotly pendukung
# ─────────────────────────────────────────────────────────────────────────────

def render_plotly_charts(history: pd.DataFrame) -> None:
    days = history.index + 1

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Kunjungan Harian")
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=days, y=history["Visits A"], name="Toko A",
                                 line=dict(color="#f87171", width=2)))
        fig.add_trace(go.Scatter(x=days, y=history["Visits B"], name="Toko B",
                                 line=dict(color="#4ade80", width=2)))
        fig.add_trace(go.Bar(x=days, y=history["Negative Experiences"],
                             name="Bad Exp", marker_color="rgba(251,191,36,0.53)", yaxis="y2"))
        fig.update_layout(
            template="plotly_dark", paper_bgcolor="#0f172a", plot_bgcolor="#1e293b",
            margin=dict(l=0, r=0, t=10, b=0), height=260, showlegend=True,
            yaxis=dict(title="Kunjungan"),
            yaxis2=dict(overlaying="y", side="right", title="Bad Exp", showgrid=False),
            legend=dict(orientation="h", y=-0.2),
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown("#### Revenue Kumulatif")
        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(x=days, y=history["Revenue A"].cumsum() / 1e6,
                                  name="Toko A", line=dict(color="#f87171", width=2),
                                  fill="tozeroy", fillcolor="rgba(248,113,113,0.16)"))
        fig2.add_trace(go.Scatter(x=days, y=history["Revenue B"].cumsum() / 1e6,
                                  name="Toko B", line=dict(color="#4ade80", width=2),
                                  fill="tozeroy", fillcolor="rgba(74,222,128,0.16)"))
        fig2.update_layout(
            template="plotly_dark", paper_bgcolor="#0f172a", plot_bgcolor="#1e293b",
            margin=dict(l=0, r=0, t=10, b=0), height=260, showlegend=True,
            yaxis=dict(title="Revenue Kumulatif (juta Rp)"),
            legend=dict(orientation="h", y=-0.2),
        )
        st.plotly_chart(fig2, use_container_width=True)

    col3, col4 = st.columns(2)

    with col3:
        st.markdown("#### WOM Messages & Avg Parking Aversion")
        fig3 = go.Figure()
        fig3.add_trace(go.Scatter(x=days, y=history["WOM Messages"], name="WOM",
                                  line=dict(color="#a78bfa", width=2, dash="dot")))
        fig3.add_trace(go.Scatter(x=days, y=history["Avg Parking Aversion"],
                                  name="Avg Aversion", line=dict(color="#38bdf8", width=2),
                                  yaxis="y2"))
        fig3.update_layout(
            template="plotly_dark", paper_bgcolor="#0f172a", plot_bgcolor="#1e293b",
            margin=dict(l=0, r=0, t=10, b=0), height=220,
            yaxis=dict(title="WOM Messages"),
            yaxis2=dict(overlaying="y", side="right", title="Avg Aversion",
                        range=[0, 1], showgrid=False),
            legend=dict(orientation="h", y=-0.25),
        )
        st.plotly_chart(fig3, use_container_width=True)

    with col4:
        st.markdown("#### Selisih Revenue A vs B (per hari)")
        delta = history["Revenue A"] - history["Revenue B"]
        colors = ["#f87171" if v >= 0 else "#4ade80" for v in delta]
        fig4 = go.Figure(go.Bar(x=days, y=delta / 1000, marker_color=colors,
                                name="Rev A − Rev B"))
        fig4.add_hline(y=0, line_dash="dot", line_color="#94a3b8")
        fig4.update_layout(
            template="plotly_dark", paper_bgcolor="#0f172a", plot_bgcolor="#1e293b",
            margin=dict(l=0, r=0, t=10, b=0), height=220,
            yaxis=dict(title="Rev A − Rev B (ribu Rp)"),
        )
        st.plotly_chart(fig4, use_container_width=True)

# ─────────────────────────────────────────────────────────────────────────────
# Main — jalankan simulasi saat tombol ditekan
# ─────────────────────────────────────────────────────────────────────────────

if run_button:
    with st.spinner("Menjalankan simulasi ABM..."):
        model = BaselineMiniMarket(
            num_customers=num_customers,
            days=days,
            parking_fee=parking_fee,
            distance_to_B=distance_to_B,
            attractiveness_A=attractiveness_A,
            attractiveness_B=attractiveness_B,
            parking_aversion=parking_aversion,
            memory_strength=memory_strength,
            wom_probability=wom_probability,
            wom_strength=wom_strength,
            num_contacts=num_contacts,
            beta_distance=beta_distance,
            beta_parking=beta_parking,
            beta_fee_ratio=beta_fee_ratio,
            seed=int(seed),
        )
        history = model.run()

        st.session_state.history        = history
        st.session_state.abm_daily      = build_abm_daily(history)
        st.session_state.agent_snapshots= build_agent_snapshots(model)
        st.session_state.sim_config     = build_sim_config(model, days)
        st.session_state.dcm_results    = build_dcm_results(model)
        st.session_state.ran            = True

if st.session_state.get("ran"):
    history         = st.session_state.history
    abm_daily       = st.session_state.abm_daily
    agent_snapshots = st.session_state.agent_snapshots
    sim_config      = st.session_state.sim_config
    dcm_results     = st.session_state.dcm_results

    # ── Ringkasan singkat ──────────────────────────────────────
    st.divider()
    total_rev_a = history["Revenue A"].sum()
    total_rev_b = history["Revenue B"].sum()
    total_visits_a = history["Visits A"].sum()
    total_visits_b = history["Visits B"].sum()
    rev_lost = total_rev_a - total_rev_b

    m1, m2, m3, m4, m5 = st.columns(5)
    m1.metric("Total Kunjungan A", f"{total_visits_a:,}")
    m2.metric("Total Kunjungan B", f"{total_visits_b:,}",
              delta=f"{total_visits_b - total_visits_a:+,} vs A")
    m3.metric("Revenue A (total)", f"Rp{total_rev_a/1e6:.1f}jt")
    m4.metric("Revenue B (total)", f"Rp{total_rev_b/1e6:.1f}jt",
              delta=f"Rp{(total_rev_b - total_rev_a)/1e6:+.1f}jt vs A")
    m5.metric("Total WOM Messages", f"{int(history['WOM Messages'].sum()):,}")

    # ── Animasi p5.js ──────────────────────────────────────────
    st.divider()
    st.markdown("### 🎬 Animasi Dinamika Pelanggan")
    render_abm_animation(abm_daily, agent_snapshots, dcm_results, sim_config)

    # ── Panel DCM ──────────────────────────────────────────────
    st.divider()
    render_dcm_summary(dcm_results)

    # ── Chart Plotly ───────────────────────────────────────────
    st.divider()
    st.markdown("### 📈 Analisis Detail")
    render_plotly_charts(history)

    # ── Tabel data mentah ──────────────────────────────────────
    with st.expander("📋 Data Harian Lengkap"):
        display_df = history.copy()
        display_df.index = display_df.index + 1
        display_df.index.name = "Hari"
        display_df["Revenue A (jt)"] = (display_df["Revenue A"] / 1e6).round(3)
        display_df["Revenue B (jt)"] = (display_df["Revenue B"] / 1e6).round(3)
        st.dataframe(display_df, use_container_width=True)

else:
    st.info("⬅️ Atur parameter di sidebar, lalu klik **Jalankan Simulasi**.")
    st.markdown("""
    **Cara kerja model:**
    - **DCM (Discrete Choice Model):** koefisien β mengukur pengaruh jarak, keberadaan jukir, dan rasio biaya terhadap utilitas konsumen
    - **ABM:** setiap agen memiliki `parking_aversion` pribadi yang meningkat setiap kena pengalaman buruk
    - **WOM:** agen yang kena bad experience menyebarkan cerita ke tetangga → aversion tetangga naik
    - Revenue yang hilang = selisih akumulasi revenue Toko A vs Toko B akibat dinamika di atas
    """)
