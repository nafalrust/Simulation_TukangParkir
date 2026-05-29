"""
app.py — Streamlit Interactive App
ABM Simulasi Word-of-Mouth Tukang Parkir Liar
Menggunakan model dari main.py (Mesa ABM)

Run: streamlit run app.py
"""

import time
import numpy as np
import pandas as pd
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

import config as cfg
from main import MiniMarket

# ─────────────────────────────────────────────────────────────────────────────
# Page config
# ─────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="MiniMarket ABM",
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
    border-radius: 14px;
    padding: 1.4rem 1.8rem;
    margin-bottom: 1.2rem;
    border-left: 4px solid #3b82f6;
}
.title-main {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 1.6rem;
    font-weight: 600;
    color: #f8fafc;
    margin: 0;
}
.title-sub {
    color: #94a3b8;
    font-size: 0.85rem;
    margin-top: 0.3rem;
}
.badge {
    display: inline-block;
    border-radius: 5px;
    padding: 2px 9px;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: 'IBM Plex Mono', monospace;
}
.badge-a { background: #fee2e2; color: #dc2626; }
.badge-b { background: #d1fae5; color: #059669; }
.badge-wom { background: #ede9fe; color: #7c3aed; }

.section-header {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.4rem;
    margin: 1.2rem 0 0.8rem;
}
.assumption-box {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 0.8rem 1rem;
    font-size: 0.82rem;
    color: #0369a1;
}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def fmt_rp(v: float) -> str:
    if v >= 1_000_000:
        return f"Rp {v/1_000_000:.2f} jt"
    return f"Rp {v:,.0f}"


def build_agent_map(model: MiniMarket, day: int, distance: float) -> go.Figure:
    """Scatter plot posisi pelanggan + lokasi toko — replikasi visualize.py di Plotly."""
    xs = [c.x for c in model.customers]
    ys = [c.y for c in model.customers]
    colors_raw = []
    sizes = []
    border_colors = []
    hover_texts = []

    for c in model.customers:
        if c.choice == "A":
            colors_raw.append("#dc2626")
        elif c.choice == "B":
            colors_raw.append("#059669")
        else:
            colors_raw.append("#9ca3af")
        sizes.append(8 + 30 * c.perceived_risk_a)
        border_colors.append("#facc15" if c.had_bad_experience else "rgba(255,255,255,0.6)")
        hover_texts.append(
            f"Pilihan: {c.choice or 'tidak belanja'}<br>"
            f"Persepsi risiko A: {c.perceived_risk_a:.3f}<br>"
            f"Aversion: {c.parking_aversion:.2f}<br>"
            f"Pengalaman buruk: {'Ya' if c.had_bad_experience else 'Tidak'}"
        )

    fig = go.Figure()

    # Pelanggan
    fig.add_trace(go.Scatter(
        x=xs, y=ys,
        mode="markers",
        marker=dict(
            color=colors_raw,
            size=sizes,
            line=dict(color=border_colors, width=1.5),
            opacity=0.82,
        ),
        hovertext=hover_texts,
        hoverinfo="text",
        name="Pelanggan",
    ))

    # Toko A
    fig.add_trace(go.Scatter(
        x=[model.store_a.x], y=[model.store_a.y],
        mode="markers+text",
        marker=dict(symbol="square", size=18, color="#dc2626",
                    line=dict(color="#111827", width=1.5)),
        text=["🏪 A"], textposition="top center",
        name="Toko A (ada jukir)",
        hoverinfo="name",
    ))

    # Toko B
    fig.add_trace(go.Scatter(
        x=[model.store_b.x], y=[model.store_b.y],
        mode="markers+text",
        marker=dict(symbol="square", size=18, color="#059669",
                    line=dict(color="#111827", width=1.5)),
        text=["🏪 B"], textposition="top center",
        name="Toko B (tanpa jukir)",
        hoverinfo="name",
    ))

    lim = max(cfg.MARKET_RADIUS, distance) * 1.15
    fig.update_layout(
        height=420,
        margin=dict(l=10, r=10, t=40, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="#f8fafc",
        xaxis=dict(range=[-cfg.MARKET_RADIUS * 1.1, lim], showgrid=True,
                   gridcolor="#e2e8f0", title="Koordinat x (meter)"),
        yaxis=dict(range=[-cfg.MARKET_RADIUS * 1.15, cfg.MARKET_RADIUS * 1.15],
                   showgrid=True, gridcolor="#e2e8f0", title="Koordinat y (meter)"),
        legend=dict(orientation="h", y=-0.12),
        title=dict(
            text=f"<b>Hari {day}</b> | Jarak A–B: {distance:.0f} m "
                 f"| 🔴 pilih A | 🟢 pilih B | ⚫ tidak belanja "
                 f"| 🟡 border = pengalaman buruk hari ini",
            font=dict(size=11, family="IBM Plex Mono"),
        ),
        font=dict(family="IBM Plex Sans"),
    )
    return fig


def build_visits_fig(history: pd.DataFrame, days_total: int, n_customers: int) -> go.Figure:
    if history.empty:
        return go.Figure()
    days = history.index + 1
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=days, y=history["Visits A"], name="Toko A (ada jukir)",
                             line=dict(color="#dc2626", width=2.5),
                             fill="tozeroy", fillcolor="rgba(220,38,38,0.07)"))
    fig.add_trace(go.Scatter(x=days, y=history["Visits B"], name="Toko B (tanpa jukir)",
                             line=dict(color="#059669", width=2.5),
                             fill="tozeroy", fillcolor="rgba(5,150,105,0.07)"))
    fig.update_layout(
        height=240, margin=dict(l=10, r=10, t=35, b=10),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        title=dict(text="Kunjungan Harian", font=dict(size=12, family="IBM Plex Mono")),
        xaxis=dict(range=[1, days_total], showgrid=True, gridcolor="#f1f5f9", title="Hari"),
        yaxis=dict(range=[0, int(n_customers * 0.55)], showgrid=True,
                   gridcolor="#f1f5f9", title="Jumlah"),
        legend=dict(orientation="h", y=1.15),
        font=dict(family="IBM Plex Sans"),
    )
    return fig


def build_revenue_risk_fig(history: pd.DataFrame, days_total: int,
                            n_customers: int, shopping_prob: float,
                            avg_spending: int) -> go.Figure:
    if history.empty:
        return go.Figure()

    days = history.index + 1
    rev_a = history["Revenue A"].cumsum() / 1_000_000
    rev_b = history["Revenue B"].cumsum() / 1_000_000
    max_rev = n_customers * shopping_prob * days_total * avg_spending / 1_000_000

    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(go.Scatter(x=days, y=rev_a, name="Revenue A",
                             line=dict(color="#dc2626", width=2.5),
                             fill="tozeroy", fillcolor="rgba(220,38,38,0.07)"),
                  secondary_y=False)
    fig.add_trace(go.Scatter(x=days, y=rev_b, name="Revenue B",
                             line=dict(color="#059669", width=2.5),
                             fill="tozeroy", fillcolor="rgba(5,150,105,0.07)"),
                  secondary_y=False)
    fig.add_trace(go.Scatter(x=days, y=history["Avg Risk A"], name="Avg Risk A",
                             line=dict(color="#7c3aed", width=1.8, dash="dot")),
                  secondary_y=True)

    fig.update_layout(
        height=240, margin=dict(l=10, r=10, t=35, b=10),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        title=dict(text="Revenue Kumulatif & Persepsi Risiko", font=dict(size=12, family="IBM Plex Mono")),
        xaxis=dict(range=[1, days_total], showgrid=True, gridcolor="#f1f5f9", title="Hari"),
        legend=dict(orientation="h", y=1.2),
        font=dict(family="IBM Plex Sans"),
    )
    fig.update_yaxes(title_text="Revenue (juta Rp)", range=[0, max(1, max_rev)],
                     showgrid=True, gridcolor="#f1f5f9", secondary_y=False)
    fig.update_yaxes(title_text="Avg Risk A (0–1)", range=[0, 1],
                     showgrid=False, secondary_y=True)
    return fig


def build_wom_fig(history: pd.DataFrame, days_total: int) -> go.Figure:
    if history.empty:
        return go.Figure()
    days = history.index + 1
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(go.Bar(x=days, y=history["Bad Experiences"], name="Pengalaman Buruk",
                         marker_color="rgba(220,38,38,0.7)"), secondary_y=False)
    fig.add_trace(go.Scatter(x=days, y=history["WOM Messages"],
                             name="Pesan WOM", line=dict(color="#7c3aed", width=2)),
                  secondary_y=True)
    fig.update_layout(
        height=240, margin=dict(l=10, r=10, t=35, b=10),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        title=dict(text="Pengalaman Buruk & Penyebaran Word-of-Mouth",
                   font=dict(size=12, family="IBM Plex Mono")),
        xaxis=dict(range=[1, days_total], showgrid=True, gridcolor="#f1f5f9", title="Hari"),
        legend=dict(orientation="h", y=1.2),
        font=dict(family="IBM Plex Sans"),
        barmode="overlay",
    )
    fig.update_yaxes(title_text="Bad Experiences", secondary_y=False)
    fig.update_yaxes(title_text="WOM Messages", showgrid=False, secondary_y=True)
    return fig


def build_sensitivity_fig(results_df: pd.DataFrame, x_col: str, x_label: str) -> go.Figure:
    fig = make_subplots(rows=1, cols=3,
                        subplot_titles=["Total Kunjungan A", "Total Revenue A (jt)", "Final Avg Risk A"])

    agg = results_df.groupby(x_col, as_index=False).mean(numeric_only=True)

    fig.add_trace(go.Scatter(x=agg[x_col], y=agg["Total Visits A"],
                             mode="lines+markers", line=dict(color="#dc2626", width=2),
                             name="Toko A"), row=1, col=1)
    fig.add_trace(go.Scatter(x=agg[x_col], y=agg["Total Visits B"],
                             mode="lines+markers", line=dict(color="#059669", width=2),
                             name="Toko B"), row=1, col=1)

    fig.add_trace(go.Scatter(x=agg[x_col], y=agg["Total Revenue A"] / 1_000_000,
                             mode="lines+markers", line=dict(color="#dc2626", width=2),
                             name="Revenue A", showlegend=False), row=1, col=2)
    fig.add_trace(go.Scatter(x=agg[x_col], y=agg["Total Revenue B"] / 1_000_000,
                             mode="lines+markers", line=dict(color="#059669", width=2),
                             name="Revenue B", showlegend=False), row=1, col=2)

    fig.add_trace(go.Scatter(x=agg[x_col], y=agg["Final Avg Risk A"],
                             mode="lines+markers", line=dict(color="#7c3aed", width=2),
                             name="Risk A", showlegend=False), row=1, col=3)

    fig.update_layout(
        height=320, margin=dict(l=10, r=10, t=50, b=10),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="IBM Plex Sans"),
        legend=dict(orientation="h", y=1.2),
    )
    for col in [1, 2, 3]:
        fig.update_xaxes(title_text=x_label, showgrid=True, gridcolor="#f1f5f9", row=1, col=col)
        fig.update_yaxes(showgrid=True, gridcolor="#f1f5f9", row=1, col=col)

    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Sidebar
# ─────────────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## ⚙️ Parameter Simulasi")

    st.markdown("#### 🎲 Seed")
    seed = st.number_input("Random Seed", value=cfg.RANDOM_SEED, step=1,
                           help="Seed sama = hasil sama. Ganti untuk trial berbeda.")

    st.markdown("#### 👥 Populasi & Geografi")
    num_customers = st.slider("Jumlah Pelanggan", cfg.UI["customers_min"],
                              cfg.UI["customers_max"], cfg.NUM_CUSTOMERS, step=10)
    distance = st.slider("Jarak Toko A–B (m)", cfg.UI["distance_min"],
                         cfg.UI["distance_max"], cfg.DISTANCE_BETWEEN_STORES,
                         step=cfg.UI["distance_step"])
    days = st.slider("Durasi Simulasi (hari)", cfg.UI["days_min"],
                     cfg.UI["days_max"], cfg.SIMULATION_DAYS, step=5)

    st.markdown("#### 🛒 Perilaku Belanja")
    shopping_prob = st.slider("Prob. Belanja / Hari", 0.1, 0.8,
                              cfg.SHOPPING_NEED_PROBABILITY, step=0.05)
    avg_spending = st.select_slider("Avg Spending (Rp)",
                                    options=list(range(cfg.UI["spending_min"],
                                                       cfg.UI["spending_max"] + 1,
                                                       cfg.UI["spending_step"])),
                                    value=cfg.AVERAGE_SPENDING)

    st.markdown("#### 🚫 Tukang Parkir")
    parking_intensity = st.slider("Intensitas Jukir", cfg.UI["parking_intensity_min"],
                                  cfg.UI["parking_intensity_max"],
                                  cfg.PARKING_INTENSITY, step=0.05,
                                  help="0=pasif, 1=sangat agresif")

    st.markdown("#### 📣 Word of Mouth")
    wom_impact = st.slider("Dampak WOM", cfg.UI["wom_impact_min"],
                           cfg.UI["wom_impact_max"], cfg.WORD_OF_MOUTH_IMPACT, step=0.01)
    share_prob = st.slider("Prob. Berbagi Cerita", cfg.UI["share_prob_min"],
                           cfg.UI["share_prob_max"], cfg.SHARE_PROBABILITY, step=0.05)

    st.markdown("#### 🧠 Memori & Persepsi")
    memory_decay = st.slider("Memory Decay / Hari", 0.0, 0.1,
                             cfg.MEMORY_DECAY, step=0.005,
                             help="Seberapa cepat persepsi risiko memudar")
    direct_impact = st.slider("Dampak Pengalaman Langsung", 0.1, 0.8,
                              cfg.DIRECT_EXPERIENCE_IMPACT, step=0.05)

    st.markdown("---")
    run_btn = st.button("▶ Jalankan Simulasi", type="primary", use_container_width=True)

    st.markdown("#### 🎬 Animasi Step-by-Step")
    animate_mode = st.toggle("Mode Animasi", value=False)
    if animate_mode:
        anim_speed = st.slider("Delay antar hari (detik)", 0.05, 2.0, 0.3, step=0.05)

    st.markdown("---")
    st.caption("Model: ABM (Mesa) — Word-of-Mouth\nVisualisasi: Streamlit + Plotly")


# ─────────────────────────────────────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────────────────────────────────────

st.markdown("""
<div class="title-block">
  <div class="title-main">🏪 MiniMarket ABM</div>
  <div class="title-sub">
    Agent-Based Model — Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket
    &nbsp;|&nbsp; Model: Mesa · Visualisasi: Streamlit + Plotly
  </div>
</div>
""", unsafe_allow_html=True)

# Info asumsi
with st.expander("ℹ️ Catatan Asumsi Parameter — baca sebelum presentasi", expanded=False):
    st.markdown("""
    Semua parameter memiliki nilai default yang **defensible secara akademis**.
    Berikut ringkasan data yang bisa diasumsi vs yang sebaiknya diukur:

    | Parameter | Status | Catatan |
    |---|---|---|
    | `avg_spending = Rp 25.000` | ✅ **Bisa diasumsi** | Sesuai estimasi laporan Indomaret/Alfamart |
    | `shopping_prob = 0.35` | ✅ **Bisa diasumsi** | ~2–3x/minggu, wajar untuk minimarket |
    | `parking_intensity = 0.7` | ✅ **Bisa diasumsi** | Jukir aktif, menghampiri kendaraan |
    | `wom_impact = 0.18` | ✅ **Bisa diasumsi** | Referensi: behavioral economics bad news bias |
    | `share_probability = 0.6` | ✅ **Bisa diasumsi** | 60% orang cerita setelah kena jukir |
    | `num_customers = 200` | ⚠️ **Estimasi lebih baik** | Hitung KK dalam radius 600m via Google Maps |
    | `distance = 500m` | ⚠️ **Ukur di Maps** | Pilih dua minimarket nyata, ukur jaraknya |
    | `avg_spending` | ⚠️ **Survei jika sempat** | Tanya 30 orang keluar toko: "tadi belanja berapa?" |

    Untuk **validasi model**: jalankan simulasi, bandingkan rasio kunjungan A:B dengan
    observasi singkat di lapangan (hitung pengunjung masuk tiap toko selama 1 jam).
    """)

# ─────────────────────────────────────────────────────────────────────────────
# State management
# ─────────────────────────────────────────────────────────────────────────────

if "model" not in st.session_state:
    st.session_state.model = None
    st.session_state.history = pd.DataFrame()
    st.session_state.ran = False
    st.session_state.current_day = 0
    st.session_state.params = {}


def make_model(dist_override=None) -> MiniMarket:
    return MiniMarket(
        num_customers=num_customers,
        distance_between_stores=dist_override if dist_override else distance,
        market_radius=cfg.MARKET_RADIUS,
        social_degree=cfg.SOCIAL_DEGREE,
        days=days,
        shopping_need_probability=shopping_prob,
        parking_intensity=parking_intensity,
        initial_risk_a=cfg.INITIAL_RISK_A,
        direct_experience_impact=direct_impact,
        word_of_mouth_impact=wom_impact,
        share_probability=share_prob,
        memory_decay=memory_decay,
        average_spending=avg_spending,
        seed=seed,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Run simulation
# ─────────────────────────────────────────────────────────────────────────────

if run_btn:
    if animate_mode:
        # Build model fresh, run step by step
        model = make_model()
        st.session_state.model = model
        st.session_state.history = pd.DataFrame()
        st.session_state.ran = True
        st.session_state.current_day = 0

        st.markdown('<div class="section-header">🎬 Animasi Simulasi</div>', unsafe_allow_html=True)

        col_map, col_charts = st.columns([1.4, 1.0])

        with col_map:
            map_placeholder = st.empty()
        with col_charts:
            visits_ph  = st.empty()
            revenue_ph = st.empty()
            wom_ph     = st.empty()

        metrics_ph = st.empty()
        stop_btn   = st.button("⏹ Stop")

        for day_i in range(days):
            if stop_btn:
                break

            model.step()
            history = model.datacollector.get_model_vars_dataframe()
            current_day = day_i + 1

            with map_placeholder.container():
                st.plotly_chart(build_agent_map(model, current_day, distance),
                                use_container_width=True, key=f"map_{day_i}")

            with visits_ph.container():
                st.plotly_chart(build_visits_fig(history, days, num_customers),
                                use_container_width=True, key=f"vis_{day_i}")

            with revenue_ph.container():
                st.plotly_chart(build_revenue_risk_fig(history, days, num_customers,
                                                        shopping_prob, avg_spending),
                                use_container_width=True, key=f"rev_{day_i}")

            with wom_ph.container():
                st.plotly_chart(build_wom_fig(history, days),
                                use_container_width=True, key=f"wom_{day_i}")

            last = history.iloc[-1]
            with metrics_ph.container():
                c1, c2, c3, c4 = st.columns(4)
                c1.metric("Kunjungan A (hari ini)", int(last["Visits A"]))
                c2.metric("Kunjungan B (hari ini)", int(last["Visits B"]))
                c3.metric("Avg Risk A", f"{last['Avg Risk A']:.3f}")
                c4.metric("WOM Messages", int(last["WOM Messages"]))

            time.sleep(anim_speed)

        st.session_state.history = model.datacollector.get_model_vars_dataframe()
        st.success(f"✅ Animasi selesai hari ke-{days}!")

    else:
        # Full run sekaligus
        with st.spinner("⏳ Menjalankan simulasi..."):
            model = make_model()
            history = model.run()
            st.session_state.model = model
            st.session_state.history = history
            st.session_state.ran = True
        st.success(f"✅ Selesai! Seed: {seed} | {num_customers} pelanggan | {days} hari | Jarak: {distance:.0f}m")


# ─────────────────────────────────────────────────────────────────────────────
# Results
# ─────────────────────────────────────────────────────────────────────────────

if st.session_state.ran and not animate_mode:
    model   = st.session_state.model
    history = st.session_state.history

    if history.empty:
        st.warning("Belum ada data — jalankan simulasi dulu.")
        st.stop()

    # ── Summary metrics ───────────────────────────────────────────────────

    st.markdown('<div class="section-header">📊 Ringkasan Hasil</div>', unsafe_allow_html=True)

    total_rev_a  = history["Revenue A"].sum()
    total_rev_b  = history["Revenue B"].sum()
    total_vis_a  = history["Visits A"].sum()
    total_vis_b  = history["Visits B"].sum()
    final_risk   = history["Avg Risk A"].iloc[-1]
    total_bad    = history["Bad Experiences"].sum()
    total_wom    = history["WOM Messages"].sum()
    rev_loss_pct = (total_rev_b - total_rev_a) / (total_rev_b + 1) * 100

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Revenue Toko A (ada jukir)", fmt_rp(total_rev_a),
                delta=f"{(total_rev_a - total_rev_b)/1000:.0f}k vs B",
                delta_color="normal")
    col2.metric("Revenue Toko B (tanpa jukir)", fmt_rp(total_rev_b))
    col3.metric("Final Avg Risk Persepsi A", f"{final_risk:.3f}",
                delta=f"Dari {cfg.INITIAL_RISK_A:.2f} awal",
                delta_color="inverse")
    col4.metric("Total Pesan WOM Negatif", f"{total_wom:,}")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Kunjungan A", f"{total_vis_a:,}")
    c2.metric("Total Kunjungan B", f"{total_vis_b:,}")
    c3.metric("Total Pengalaman Buruk", f"{total_bad:,}")
    c4.metric("Revenue Loss A vs B", f"{rev_loss_pct:.1f}%",
              help="Persentase selisih revenue A terhadap B")

    st.markdown("---")

    # ── Agent Map (final state) ───────────────────────────────────────────

    st.markdown('<div class="section-header">🗺️ Peta Pelanggan — State Hari Terakhir</div>',
                unsafe_allow_html=True)
    st.plotly_chart(build_agent_map(model, days, distance), use_container_width=True)

    st.markdown("---")

    # ── Time series charts ────────────────────────────────────────────────

    st.markdown('<div class="section-header">📈 Time Series</div>', unsafe_allow_html=True)

    col_v, col_r = st.columns(2)
    with col_v:
        st.plotly_chart(build_visits_fig(history, days, num_customers),
                        use_container_width=True)
    with col_r:
        st.plotly_chart(build_revenue_risk_fig(history, days, num_customers,
                                               shopping_prob, avg_spending),
                        use_container_width=True)

    st.plotly_chart(build_wom_fig(history, days), use_container_width=True)

    st.markdown("---")

    # ── Sensitivity Analysis ──────────────────────────────────────────────

    st.markdown('<div class="section-header">🔬 Sensitivity Analysis</div>',
                unsafe_allow_html=True)

    sens_tab1, sens_tab2, sens_tab3 = st.tabs(
        ["Jarak A–B", "Intensitas Jukir", "Dampak WOM"]
    )

    def run_sensitivity(param_name: str, param_values: list,
                        n_rep: int = 3) -> pd.DataFrame:
        rows = []
        prog = st.progress(0)
        for idx, val in enumerate(param_values):
            for rep in range(n_rep):
                kwargs = dict(
                    num_customers=num_customers,
                    market_radius=cfg.MARKET_RADIUS,
                    social_degree=cfg.SOCIAL_DEGREE,
                    days=days,
                    shopping_need_probability=shopping_prob,
                    parking_intensity=parking_intensity,
                    initial_risk_a=cfg.INITIAL_RISK_A,
                    direct_experience_impact=direct_impact,
                    word_of_mouth_impact=wom_impact,
                    share_probability=share_prob,
                    memory_decay=memory_decay,
                    average_spending=avg_spending,
                    seed=seed + rep,
                )
                kwargs[param_name] = val
                m = MiniMarket(**kwargs)
                r = m.run()
                rows.append({
                    param_name: val,
                    "Replication": rep + 1,
                    "Total Visits A": int(r["Visits A"].sum()),
                    "Total Visits B": int(r["Visits B"].sum()),
                    "Total Revenue A": int(r["Revenue A"].sum()),
                    "Total Revenue B": int(r["Revenue B"].sum()),
                    "Final Avg Risk A": float(r["Avg Risk A"].iloc[-1]),
                })
            prog.progress((idx + 1) / len(param_values))
        prog.empty()
        return pd.DataFrame(rows)

    with sens_tab1:
        st.caption("Bagaimana kunjungan dan revenue berubah seiring jarak antara dua toko?")
        if st.button("▶ Jalankan — Sensitivity Jarak", key="sens_dist"):
            distances = [100, 250, 500, 750, 1000, 1250, 1500]
            df = run_sensitivity("distance_between_stores", distances)
            st.plotly_chart(build_sensitivity_fig(df, "distance_between_stores", "Jarak A–B (m)"),
                            use_container_width=True)
            with st.expander("Lihat tabel hasil"):
                st.dataframe(df, use_container_width=True)

    with sens_tab2:
        st.caption("Seberapa sensitif revenue terhadap tingkat keagresifan tukang parkir?")
        if st.button("▶ Jalankan — Sensitivity Intensitas Jukir", key="sens_park"):
            intensities = [0.1, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
            df = run_sensitivity("parking_intensity", intensities)
            st.plotly_chart(build_sensitivity_fig(df, "parking_intensity", "Intensitas Jukir"),
                            use_container_width=True)
            with st.expander("Lihat tabel hasil"):
                st.dataframe(df, use_container_width=True)

    with sens_tab3:
        st.caption("Seberapa kuat efek word-of-mouth mempengaruhi perpindahan pelanggan?")
        if st.button("▶ Jalankan — Sensitivity WOM Impact", key="sens_wom"):
            impacts = [0.0, 0.05, 0.10, 0.15, 0.18, 0.25, 0.35, 0.50]
            df = run_sensitivity("word_of_mouth_impact", impacts)
            st.plotly_chart(build_sensitivity_fig(df, "word_of_mouth_impact", "WOM Impact"),
                            use_container_width=True)
            with st.expander("Lihat tabel hasil"):
                st.dataframe(df, use_container_width=True)

    st.markdown("---")

    # ── Insight ───────────────────────────────────────────────────────────

    st.markdown('<div class="section-header">💡 Insight Otomatis</div>', unsafe_allow_html=True)

    ratio = total_vis_a / (total_vis_b + 1)
    risk_growth = final_risk - cfg.INITIAL_RISK_A

    if ratio < 0.8:
        st.error(
            f"🚨 **Tukang parkir secara signifikan merugikan Toko A.** "
            f"Kunjungan A hanya {total_vis_a:,} vs B {total_vis_b:,} (rasio {ratio:.2f}). "
            f"Persepsi risiko tumbuh dari {cfg.INITIAL_RISK_A:.2f} → {final_risk:.3f} "
            f"didorong {total_wom:,} pesan WOM negatif dalam {days} hari. "
            f"Estimasi revenue loss: {fmt_rp(total_rev_b - total_rev_a)}."
        )
    elif ratio < 0.95:
        st.warning(
            f"⚠️ **Toko A mulai kehilangan pelanggan** akibat efek word-of-mouth. "
            f"Rasio kunjungan A:B = {ratio:.2f}. Jika tren berlanjut, "
            f"revenue loss akan semakin besar seiring risiko persepsi yang terakumulasi ({final_risk:.3f})."
        )
    else:
        st.info(
            f"ℹ️ **Dampak jukir pada kunjungan masih terbatas** di rentang parameter ini. "
            f"Rasio A:B = {ratio:.2f}. Coba naikkan `parking_intensity` atau `wom_impact` "
            f"untuk melihat efek yang lebih dramatis."
        )

    # ── Raw data ──────────────────────────────────────────────────────────

    with st.expander("📋 Data Harian Lengkap"):
        display_hist = history.copy()
        display_hist.index = display_hist.index + 1
        display_hist.index.name = "Hari"
        display_hist["Revenue A"] = display_hist["Revenue A"].apply(fmt_rp)
        display_hist["Revenue B"] = display_hist["Revenue B"].apply(fmt_rp)
        st.dataframe(display_hist, use_container_width=True)

elif not st.session_state.ran:
    # Placeholder
    st.markdown("""
    <div style="text-align:center; padding: 3.5rem; color: #94a3b8;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🏪</div>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 1rem; color: #64748b;">
            Atur parameter di sidebar → klik <b>Jalankan Simulasi</b>
        </div>
        <div style="margin-top: 0.6rem; font-size: 0.85rem;">
            Model ABM akan mensimulasikan dua toko bersaing selama N hari.<br>
            Toko A memiliki tukang parkir liar; Toko B tidak.
        </div>
    </div>
    """, unsafe_allow_html=True)

    ci1, ci2, ci3 = st.columns(3)
    ci1.info("**🔴 Toko A** — Ada tukang parkir liar\n\nPelanggan bisa kena pengalaman buruk → cerita ke teman → teman hindari toko A")
    ci2.success("**🟢 Toko B** — Tanpa tukang parkir\n\nTidak ada risiko jukir. Menerima limpahan pelanggan yang berpindah dari A")
    ci3.markdown('<div class="badge badge-wom">WOM Effect</div>', unsafe_allow_html=True)
    ci3.info("**📣 Word-of-Mouth**\n\nCerita negatif menyebar lewat jaringan sosial. Semakin banyak bad experience → semakin cepat reputasi A jatuh")
