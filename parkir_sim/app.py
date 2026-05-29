"""
app.py — Streamlit Interactive App
Simulasi Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket

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
from simulation import ParkingSimulation, run_both_scenarios, SimStats

# ─────────────────────────────────────────────────────────────────────────────
# Page Config
# ─────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="ParkSim — Simulasi Parkir Minimarket",
    page_icon="🅿️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────────────────────
# Custom CSS
# ─────────────────────────────────────────────────────────────────────────────

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap');

html, body, [class*="css"] {
    font-family: 'DM Sans', sans-serif;
}

/* Header */
.main-title {
    font-family: 'Space Mono', monospace;
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.5px;
    margin-bottom: 0.2rem;
}
.main-sub {
    color: #64748b;
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
}

/* Metric cards */
.metric-card {
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem 1.2rem;
    margin-bottom: 0.5rem;
}
.metric-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    font-weight: 500;
}
.metric-value {
    font-family: 'Space Mono', monospace;
    font-size: 1.6rem;
    font-weight: 700;
    color: #0f172a;
}
.metric-delta-pos { color: #10b981; font-size: 0.85rem; }
.metric-delta-neg { color: #ef4444; font-size: 0.85rem; }

/* Scenario badges */
.badge-no { background: #dbeafe; color: #1d4ed8; border-radius: 6px;
            padding: 2px 10px; font-size: 0.8rem; font-weight: 600; }
.badge-jukir { background: #fee2e2; color: #dc2626; border-radius: 6px;
               padding: 2px 10px; font-size: 0.8rem; font-weight: 600; }

/* Parking grid */
.parking-header {
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    color: #475569;
    margin-bottom: 0.4rem;
}

/* Sidebar */
section[data-testid="stSidebar"] {
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
}

/* Divider */
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }

/* Animation container */
.anim-container {
    background: #f1f5f9;
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid #e2e8f0;
}

.stAlert { border-radius: 10px; }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def fmt_rp(value: float) -> str:
    if value >= 1_000_000:
        return f"Rp {value/1_000_000:.2f} jt"
    return f"Rp {value:,.0f}"


def sim_time_to_clock(sim_minute: float) -> str:
    """Konversi menit simulasi → clock string (HH:MM)."""
    total = int(7 * 60 + sim_minute)
    h, m = divmod(total, 60)
    return f"{h:02d}:{m:02d}"


def build_parking_grid_fig(occupancy: int, capacity: int, scenario: str) -> go.Figure:
    """
    Buat visualisasi grid parkiran menggunakan plotly scatter.
    Hijau = kosong, Biru = terisi motor, Abu = terisi mobil.
    """
    cols = 5
    rows = int(np.ceil(capacity / cols))

    x_vals, y_vals, colors, texts, hovers = [], [], [], [], []

    for i in range(capacity):
        col = i % cols
        row = rows - i // cols - 1  # flip agar baris atas = baris pertama
        x_vals.append(col)
        y_vals.append(row)

        if i < occupancy:
            # Simulasikan tipe kendaraan secara acak (visual saja)
            is_motor = (i * 7 + 3) % 4 != 0  # deterministik visual
            colors.append("#3b82f6" if is_motor else "#8b5cf6")
            texts.append("🏍️" if is_motor else "🚗")
            hovers.append(f"Slot {i+1}: Terisi")
        else:
            colors.append("#d1fae5")
            texts.append("")
            hovers.append(f"Slot {i+1}: Kosong")

    fig = go.Figure()

    # Background slots
    fig.add_trace(go.Scatter(
        x=x_vals, y=y_vals,
        mode="markers+text",
        marker=dict(
            size=38,
            color=colors,
            symbol="square",
            line=dict(color="white", width=2),
        ),
        text=texts,
        textposition="middle center",
        textfont=dict(size=16),
        hovertext=hovers,
        hoverinfo="text",
    ))

    pct = occupancy / capacity * 100
    title_color = "#ef4444" if pct > 80 else "#f59e0b" if pct > 50 else "#10b981"

    fig.update_layout(
        height=max(220, rows * 60 + 80),
        margin=dict(l=10, r=10, t=50, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(visible=False, range=[-0.7, cols - 0.3]),
        yaxis=dict(visible=False, range=[-0.7, rows - 0.3]),
        title=dict(
            text=f"<b>Parkiran {'🟥 Hampir Penuh' if pct > 80 else '🟨 Sedang' if pct > 50 else '🟩 Tersedia'}</b> — {occupancy}/{capacity} slot ({pct:.0f}%)",
            font=dict(size=13, color=title_color),
            x=0,
        ),
        showlegend=False,
    )
    return fig


def build_timeseries_fig(
    ts_no: dict, ts_jukir: dict, metric: str, title: str, yaxis_title: str
) -> go.Figure:
    fig = go.Figure()

    x_no    = [sim_time_to_clock(t) for t in ts_no["time"]]
    x_jukir = [sim_time_to_clock(t) for t in ts_jukir["time"]]

    fig.add_trace(go.Scatter(
        x=x_no, y=ts_no[metric],
        name="Tanpa Jukir",
        line=dict(color="#3b82f6", width=2.5),
        fill="tozeroy",
        fillcolor="rgba(59,130,246,0.08)",
    ))
    fig.add_trace(go.Scatter(
        x=x_jukir, y=ts_jukir[metric],
        name="Dengan Jukir",
        line=dict(color="#ef4444", width=2.5, dash="dot"),
        fill="tozeroy",
        fillcolor="rgba(239,68,68,0.06)",
    ))
    fig.update_layout(
        title=dict(text=title, font=dict(size=13)),
        height=260,
        margin=dict(l=10, r=10, t=40, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=True, gridcolor="#f1f5f9", tickangle=-45),
        yaxis=dict(showgrid=True, gridcolor="#f1f5f9", title=yaxis_title),
        legend=dict(orientation="h", y=1.15, x=0),
        font=dict(family="DM Sans"),
    )
    return fig


def build_summary_bar(stats_no: SimStats, stats_jukir: SimStats) -> go.Figure:
    categories = ["Total Parkir", "Balk (%)", "Revenue (ribu Rp)"]
    vals_no = [
        stats_no.total_parked,
        round(stats_no.balk_rate * 100, 1),
        round(stats_no.store_revenue / 1000, 1),
    ]
    vals_jukir = [
        stats_jukir.total_parked,
        round(stats_jukir.balk_rate * 100, 1),
        round(stats_jukir.store_revenue / 1000, 1),
    ]

    fig = make_subplots(rows=1, cols=3, subplot_titles=categories)
    for i, (v_no, v_j, cat) in enumerate(zip(vals_no, vals_jukir, categories), start=1):
        fig.add_trace(go.Bar(
            x=["Tanpa Jukir"], y=[v_no],
            marker_color="#3b82f6",
            name="Tanpa Jukir",
            showlegend=(i == 1),
        ), row=1, col=i)
        fig.add_trace(go.Bar(
            x=["Dengan Jukir"], y=[v_j],
            marker_color="#ef4444",
            name="Dengan Jukir",
            showlegend=(i == 1),
        ), row=1, col=i)

    fig.update_layout(
        height=300,
        margin=dict(l=10, r=10, t=50, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        barmode="group",
        font=dict(family="DM Sans"),
        legend=dict(orientation="h", y=1.2),
    )
    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Sidebar Controls
# ─────────────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## ⚙️ Parameter Simulasi")
    st.caption("Ubah nilai untuk mengeksplorasi sensitivitas")

    st.markdown("### 🎲 Reproducibility")
    seed = st.number_input("Random Seed", value=cfg.RANDOM_SEED, step=1,
                           help="Ganti seed untuk trial berbeda. Seed sama = hasil sama.")

    st.markdown("### ⏱️ Waktu")
    duration_hours = st.slider("Durasi Simulasi (jam)", 1, 16,
                                value=cfg.SIM_DURATION_HOURS, step=1)

    st.markdown("### 🅿️ Kapasitas Parkir")
    capacity = st.slider("Jumlah Slot Parkir", 5, 50,
                         value=cfg.PARKING_CAPACITY, step=5)

    st.markdown("### 📊 Multiplier (Sensitivity)")
    arrival_mult = st.slider("Arrival Rate ×", 0.5, 2.5, 1.0, step=0.1,
                             help="Lipat gandakan λ kedatangan")
    balk_mult    = st.slider("Balking Rate ×", 0.0, 3.0, 1.0, step=0.1,
                             help="Perkuat/lemahkan probabilitas balking")
    spend_mult   = st.slider("Spending ×", 0.5, 2.0, 1.0, step=0.1,
                             help="Kalikan nominal belanja")

    st.markdown("---")
    run_btn = st.button("▶ Jalankan Simulasi", type="primary", use_container_width=True)

    st.markdown("### 🎬 Mode Animasi")
    animate_mode = st.toggle("Animasi Real-time", value=False,
                             help="Aktifkan untuk melihat simulasi berjalan langkah demi langkah")
    if animate_mode:
        anim_speed = st.slider("Kecepatan Animasi", 0.01, 0.5, 0.05, step=0.01)

    st.markdown("---")
    st.caption("📌 Data & parameter berdasarkan asumsi awal.\nGanti dengan data lapangan untuk validasi model.")


# ─────────────────────────────────────────────────────────────────────────────
# Main Content
# ─────────────────────────────────────────────────────────────────────────────

st.markdown('<div class="main-title">🅿️ ParkSim</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="main-sub">Simulasi Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket — '
    'Discrete Event Simulation (SimPy)</div>',
    unsafe_allow_html=True
)

# State management
if "stats_no" not in st.session_state:
    st.session_state.stats_no    = None
    st.session_state.stats_jukir = None
    st.session_state.sim_no      = None
    st.session_state.sim_jukir   = None
    st.session_state.ran         = False


# ─── Run Button ─────────────────────────────────────────────────────────────

if run_btn:
    with st.spinner("⏳ Menjalankan simulasi..."):
        # Buat sim objects (simpan untuk animasi)
        sim_no = ParkingSimulation(
            scenario="no_jukir", seed=seed,
            duration_hours=duration_hours, capacity=capacity,
            arrival_multiplier=arrival_mult,
            balk_multiplier=balk_mult,
            spending_multiplier=spend_mult,
        )
        sim_jukir = ParkingSimulation(
            scenario="with_jukir", seed=seed,
            duration_hours=duration_hours, capacity=capacity,
            arrival_multiplier=arrival_mult,
            balk_multiplier=balk_mult,
            spending_multiplier=spend_mult,
        )
        stats_no    = sim_no.run()
        stats_jukir = sim_jukir.run()

        st.session_state.stats_no    = stats_no
        st.session_state.stats_jukir = stats_jukir
        st.session_state.sim_no      = sim_no
        st.session_state.sim_jukir   = sim_jukir
        st.session_state.ran         = True
        st.session_state.capacity    = capacity

    st.success(f"✅ Simulasi selesai! Seed: {seed} | Durasi: {duration_hours} jam | Kapasitas: {capacity} slot")


# ─── Results Display ─────────────────────────────────────────────────────────

if st.session_state.ran:
    stats_no    = st.session_state.stats_no
    stats_jukir = st.session_state.stats_jukir
    sim_no      = st.session_state.sim_no
    sim_jukir   = st.session_state.sim_jukir
    cap         = st.session_state.capacity

    # ── Metric Summary ────────────────────────────────────────────────────

    st.markdown("### 📊 Ringkasan Hasil")

    col1, col2, col3, col4 = st.columns(4)

    rev_diff    = stats_no.store_revenue - stats_jukir.store_revenue
    park_diff   = stats_no.total_parked  - stats_jukir.total_parked
    balk_diff   = stats_jukir.balk_rate  - stats_no.balk_rate

    with col1:
        st.metric(
            label="🏪 Revenue — Tanpa Jukir",
            value=fmt_rp(stats_no.store_revenue),
            delta=f"+{fmt_rp(rev_diff)} vs ada jukir" if rev_diff > 0 else fmt_rp(rev_diff),
        )
    with col2:
        st.metric(
            label="🚫 Revenue — Dengan Jukir",
            value=fmt_rp(stats_jukir.store_revenue),
        )
    with col3:
        st.metric(
            label="🚗 Kendaraan Parkir (Tanpa Jukir)",
            value=f"{stats_no.total_parked}",
            delta=f"+{park_diff}" if park_diff > 0 else str(park_diff),
        )
    with col4:
        st.metric(
            label="📉 Balk Rate Tambahan (Jukir)",
            value=f"{balk_diff*100:+.1f}%",
            delta=f"Tanpa: {stats_no.balk_rate*100:.1f}% | Jukir: {stats_jukir.balk_rate*100:.1f}%",
            delta_color="inverse",
        )

    st.markdown("---")

    # ── Animasi Grid Parkiran ─────────────────────────────────────────────

    st.markdown("### 🎬 Visualisasi Area Parkir")

    if animate_mode:
        st.info("🎬 Mode animasi aktif — simulasi akan diputar ulang secara visual.")
        snaps_no    = sim_no.snapshot_queue
        snaps_jukir = sim_jukir.snapshot_queue

        col_anim1, col_anim2 = st.columns(2)
        with col_anim1:
            st.markdown('<span class="badge-no">TANPA JUKIR</span>', unsafe_allow_html=True)
            placeholder_grid_no = st.empty()
            placeholder_clock_no = st.empty()
            placeholder_stats_no = st.empty()

        with col_anim2:
            st.markdown('<span class="badge-jukir">DENGAN JUKIR</span>', unsafe_allow_html=True)
            placeholder_grid_jukir = st.empty()
            placeholder_clock_jukir = st.empty()
            placeholder_stats_jukir = st.empty()

        stop_btn = st.button("⏹ Stop Animasi")

        max_frames = min(len(snaps_no), len(snaps_jukir))
        step = max(1, max_frames // 200)  # Max 200 frame untuk performa

        for i in range(0, max_frames, step):
            if stop_btn:
                break

            s_no    = snaps_no[i]
            s_jukir = snaps_jukir[i]
            clock   = sim_time_to_clock(s_no["time"])

            with placeholder_grid_no.container():
                st.plotly_chart(
                    build_parking_grid_fig(s_no["occupancy"], cap, "no_jukir"),
                    use_container_width=True, key=f"grid_no_{i}"
                )
            placeholder_clock_no.caption(f"⏰ {clock} | Kedatangan: {s_no['arrivals']} | Balk: {s_no['balked']}")
            placeholder_stats_no.caption(f"💰 Revenue: {fmt_rp(s_no['revenue'])}")

            with placeholder_grid_jukir.container():
                st.plotly_chart(
                    build_parking_grid_fig(s_jukir["occupancy"], cap, "with_jukir"),
                    use_container_width=True, key=f"grid_jukir_{i}"
                )
            placeholder_clock_jukir.caption(f"⏰ {clock} | Kedatangan: {s_jukir['arrivals']} | Balk: {s_jukir['balked']}")
            placeholder_stats_jukir.caption(f"💰 Revenue: {fmt_rp(s_jukir['revenue'])}")

            time.sleep(anim_speed)

    else:
        # Static final state
        col_g1, col_g2 = st.columns(2)
        with col_g1:
            st.markdown('<span class="badge-no">TANPA JUKIR — State Akhir</span>', unsafe_allow_html=True)
            st.plotly_chart(
                build_parking_grid_fig(stats_no.peak_occupancy, cap, "no_jukir"),
                use_container_width=True,
            )
            st.caption(f"Peak: {stats_no.peak_occupancy}/{cap} slot | Avg durasi: {stats_no.avg_park_duration:.1f} menit")

        with col_g2:
            st.markdown('<span class="badge-jukir">DENGAN JUKIR — State Akhir</span>', unsafe_allow_html=True)
            st.plotly_chart(
                build_parking_grid_fig(stats_jukir.peak_occupancy, cap, "with_jukir"),
                use_container_width=True,
            )
            st.caption(f"Peak: {stats_jukir.peak_occupancy}/{cap} slot | Avg durasi: {stats_jukir.avg_park_duration:.1f} menit")

    st.markdown("---")

    # ── Time Series Charts ────────────────────────────────────────────────

    st.markdown("### 📈 Time Series Perbandingan")

    ts_no = {
        "time":     stats_no.ts_time,
        "occupancy": stats_no.ts_occupancy,
        "revenue":  stats_no.ts_revenue_cum,
        "balk":     stats_no.ts_balk_cum,
    }
    ts_jukir = {
        "time":     stats_jukir.ts_time,
        "occupancy": stats_jukir.ts_occupancy,
        "revenue":  stats_jukir.ts_revenue_cum,
        "balk":     stats_jukir.ts_balk_cum,
    }

    tab1, tab2, tab3 = st.tabs(["🅿️ Okupansi", "💰 Revenue Kumulatif", "🚪 Balking"])

    with tab1:
        st.plotly_chart(
            build_timeseries_fig(ts_no, ts_jukir, "occupancy",
                                 "Jumlah Slot Terisi", "slot"),
            use_container_width=True,
        )

    with tab2:
        st.plotly_chart(
            build_timeseries_fig(ts_no, ts_jukir, "revenue",
                                 "Revenue Kumulatif Toko", "Rp"),
            use_container_width=True,
        )

    with tab3:
        st.plotly_chart(
            build_timeseries_fig(ts_no, ts_jukir, "balk",
                                 "Total Kendaraan Balk (Kumulatif)", "kendaraan"),
            use_container_width=True,
        )

    st.markdown("---")

    # ── Comparison Bar Chart ──────────────────────────────────────────────

    st.markdown("### ⚖️ Perbandingan Akhir")
    st.plotly_chart(build_summary_bar(stats_no, stats_jukir), use_container_width=True)

    st.markdown("---")

    # ── Insight Box ───────────────────────────────────────────────────────

    st.markdown("### 💡 Insight Otomatis")

    delta_rev_pct = (stats_no.store_revenue - stats_jukir.store_revenue) / (stats_jukir.store_revenue + 1) * 100
    delta_balk    = (stats_jukir.balk_rate - stats_no.balk_rate) * 100

    if delta_rev_pct > 5:
        st.success(
            f"✅ **Tanpa tukang parkir, revenue toko lebih tinggi {delta_rev_pct:.1f}%.** "
            f"Kehadiran jukir meningkatkan balking sebesar {delta_balk:.1f} poin persentase, "
            f"sehingga lebih banyak calon pelanggan yang pergi tanpa belanja."
        )
    elif delta_rev_pct < -5:
        st.warning(
            f"⚠️ **Dengan tukang parkir, revenue justru lebih tinggi {-delta_rev_pct:.1f}%.** "
            f"Ini bisa terjadi jika kapasitas parkiran sangat terbatas dan jukir membantu mengatur slot "
            f"sehingga lebih banyak kendaraan bisa masuk."
        )
    else:
        st.info(
            f"ℹ️ **Perbedaan revenue kedua skenario relatif kecil ({delta_rev_pct:.1f}%).** "
            f"Coba ubah parameter balking atau arrival rate untuk melihat sensitivitas lebih jelas."
        )

    # ── Event Log ─────────────────────────────────────────────────────────

    with st.expander("📋 Event Log (100 baris pertama)"):
        events_no = pd.DataFrame([{
            "id": e.vehicle_id,
            "tipe": e.vehicle_type,
            "waktu": sim_time_to_clock(e.sim_time),
            "event": e.event,
            "spending": int(e.spending),
            "durasi": round(e.duration, 1),
        } for e in stats_no.events[:100]])

        st.dataframe(events_no, use_container_width=True)

else:
    # Placeholder sebelum simulasi dijalankan
    st.markdown("""
    <div style="text-align:center; padding: 4rem; color: #94a3b8;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🅿️</div>
        <div style="font-family: 'Space Mono', monospace; font-size: 1.1rem; color: #64748b;">
            Atur parameter di sidebar, lalu klik <b>Jalankan Simulasi</b>
        </div>
        <div style="margin-top: 0.5rem; font-size: 0.85rem;">
            Simulasi akan membandingkan dua skenario: tanpa dan dengan tukang parkir liar
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Info cards
    c1, c2, c3 = st.columns(3)
    with c1:
        st.info("**Model**: Discrete Event Simulation (SimPy)\n\nDistribusi: Poisson (kedatangan), Lognormal (durasi), Normal (spending)")
    with c2:
        st.info("**Skenario A** 🔵 Tanpa Jukir\n\nBaseline: tidak ada tukang parkir liar, balking rendah")
    with c3:
        st.warning("**Skenario B** 🔴 Dengan Jukir\n\nTukang parkir aktif 08:00–20:00, balking lebih tinggi karena keengganan pelanggan")
