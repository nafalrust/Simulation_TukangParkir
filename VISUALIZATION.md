# VISUALIZATION.md — Spesifikasi Animasi p5.js

> Spesifikasi teknis lengkap untuk `minimarket_abm/components/minimarket_animation.html`.

---

## File yang Dibuat

**Path:** `minimarket_abm/components/minimarket_animation.html`

Template HTML lengkap yang di-inject data Python sebelum di-pass ke `st.components.v1.html()`. File ini harus bisa dibuka **standalone di browser** dengan data dummy untuk testing.

---

## Struktur HTML Lengkap

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f172a; overflow: hidden; font-family: 'Inter', sans-serif; }
    canvas { display: block; }

    #controls {
      display: flex; align-items: center; gap: 12px;
      padding: 6px 14px; background: #0f172a; border-top: 1px solid #334155;
    }
    #controls button {
      background: #334155; color: #f1f5f9; border: none;
      padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;
    }
    #controls button:hover { background: #3b82f6; }
    #controls button.active { background: #3b82f6; }
    #controls label { color: #94a3b8; font-size: 12px; }
    #controls input[type=range] { width: 80px; accent-color: #3b82f6; }
    #day-label { color: #f1f5f9; font-size: 12px; min-width: 60px; }
  </style>
</head>
<body>

  <!-- ── Data injection — Python mengganti string literal ini ── -->
  <script>
    const abmDaily   = '__ABM_DAILY__';
    const agentData  = '__AGENTS__';
    const dcmResults = '__DCM__';
    const simConfig  = '__CONFIG__';
  </script>

  <!-- ── p5.js dari CDN ── -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>

  <!-- ── Controls HTML native (lebih reliable dari p5.js buttons) ── -->
  <div id="controls">
    <button id="btn-rewind" title="Ke awal">◀◀</button>
    <button id="btn-play" class="active">▶ Play</button>
    <button id="btn-end" title="Ke akhir">▶▶</button>
    <label>Speed:</label>
    <input type="range" id="speed-slider" min="1" max="8" value="2">
    <label>Hari:</label>
    <input type="range" id="day-slider" min="0" value="0">
    <span id="day-label">Hari 1</span>
  </div>

  <!-- ── p5.js Sketch ── -->
  <script>
  // ════════════════════════════════════════════════════════════
  // DATA DUMMY — digunakan saat file dibuka standalone di browser
  // (akan di-override oleh data Python saat di-embed di Streamlit)
  // ════════════════════════════════════════════════════════════
  if (typeof abmDaily === 'string') {
    // Masih berupa string placeholder → gunakan dummy
    window.abmDaily = Array.from({length: 60}, (_, i) => ({
      day: i+1,
      visits_a: Math.round(70 - i*0.4 + Math.sin(i*0.3)*5),
      visits_b: Math.round(40 + i*0.3 + Math.sin(i*0.3+2)*3),
      no_buy: 10,
      bad_experiences: Math.round(8 + Math.sin(i)*3),
      wom_messages: Math.round(5 + Math.cos(i)*2),
      avg_memory_a: -(0.05 + i*0.004),
      revenue_a: Math.round(2000000 - i*8000),
      revenue_b: Math.round(1400000 + i*6000)
    }));
    window.agentData = Array.from({length: 200}, (_, i) => ({
      id: i,
      x: (Math.sin(i*1.7)*0.9) * 600,
      y: (Math.cos(i*2.3)*0.9) * 600,
      choice: i % 3 === 0 ? 'none' : i % 2 === 0 ? 'A' : 'B',
      parking_aversion: (i % 10) / 10,
      memory_a: -((i % 10) / 20),
      had_bad_experience: i % 12 === 0
    }));
    window.dcmResults = {
      beta_jarak: -0.0023, beta_parkir: -0.847,
      n_respondents: 87, pseudo_r2: 0.24,
      p_value_jarak: 0.003, p_value_parkir: 0.001
    };
    window.simConfig = {
      n_agents: 200, n_days: 60, market_radius: 600,
      store_a_x: -200, store_a_y: 0,
      store_b_x: 200, store_b_y: 0
    };
  } else {
    // Data sudah di-inject Python
    window.abmDaily   = abmDaily;
    window.agentData  = agentData;
    window.dcmResults = dcmResults;
    window.simConfig  = simConfig;
  }

  // ════════════════════════════════════════════════════════════
  // STATE GLOBAL (dikontrol dari HTML controls)
  // ════════════════════════════════════════════════════════════
  let frame   = 0;
  let playing = true;
  let speed   = 2;
  const N_DAYS = window.abmDaily.length;

  // Setup controls
  document.addEventListener('DOMContentLoaded', () => {
    const daySlider   = document.getElementById('day-slider');
    const speedSlider = document.getElementById('speed-slider');
    const btnPlay     = document.getElementById('btn-play');
    const btnRewind   = document.getElementById('btn-rewind');
    const btnEnd      = document.getElementById('btn-end');
    const dayLabel    = document.getElementById('day-label');

    daySlider.max = N_DAYS - 1;

    btnPlay.onclick = () => {
      playing = !playing;
      btnPlay.textContent = playing ? '⏸ Pause' : '▶ Play';
      btnPlay.className   = playing ? 'active' : '';
      if (!playing && frame === N_DAYS - 1) { frame = 0; }
    };
    btnRewind.onclick = () => { frame = 0; daySlider.value = 0; };
    btnEnd.onclick    = () => { frame = N_DAYS - 1; daySlider.value = N_DAYS - 1; playing = false; };

    daySlider.oninput = () => {
      frame = parseInt(daySlider.value);
      playing = false;
      btnPlay.textContent = '▶ Play';
      btnPlay.className = '';
    };
    speedSlider.oninput = () => { speed = parseInt(speedSlider.value); };

    // Sync day label
    setInterval(() => {
      dayLabel.textContent = `Hari ${frame + 1}`;
      daySlider.value = frame;
    }, 100);
  });

  // ════════════════════════════════════════════════════════════
  // p5.js SKETCH
  // ════════════════════════════════════════════════════════════
  new p5(function(p) {

    // ── Dimensi layout ──────────────────────────────────────
    const W = 720, H = 460;
    const LEFT_W = 355, RIGHT_W = 365, MAP_H = 400, CHART_H = 400;
    const PAD = 16;

    // ── Warna ───────────────────────────────────────────────
    const C = {
      bg:          p.color('#0f172a'),
      panelBg:     p.color('#1e293b'),
      border:      p.color('#334155'),
      agentA:      p.color('#ef4444'),
      agentB:      p.color('#22c55e'),
      agentNone:   p.color('#64748b'),
      agentBadExp: p.color('#fbbf24'),
      storeA:      p.color('#ef4444'),
      storeB:      p.color('#22c55e'),
      lineA:       p.color('#f87171'),
      lineB:       p.color('#4ade80'),
      lineMemory:  p.color('#a78bfa'),
      chartGrid:   p.color('#334155'),
      textPri:     p.color('#f1f5f9'),
      textSec:     p.color('#94a3b8'),
      textAcc:     p.color('#38bdf8'),
      hudBg:       p.color('#0f172a'),
    };

    let lastAdvance = 0;

    // ── Setup ───────────────────────────────────────────────
    p.setup = function() {
      p.createCanvas(W, H);
      p.frameRate(30);
      p.textFont('monospace');
    };

    // ── Draw loop ───────────────────────────────────────────
    p.draw = function() {
      p.background(C.bg);

      const d = window.abmDaily[Math.min(frame, N_DAYS - 1)];

      drawMapPanel(d);
      drawChartPanel();
      drawHUD(d);
      drawDivider();

      // Advance frame
      if (playing && p.millis() - lastAdvance > (800 / speed)) {
        frame = Math.min(frame + 1, N_DAYS - 1);
        lastAdvance = p.millis();
        if (frame === N_DAYS - 1) playing = false;
      }
    };

    // ── Divider antar panel ─────────────────────────────────
    function drawDivider() {
      p.stroke(C.border);
      p.strokeWeight(1);
      p.line(LEFT_W, 0, LEFT_W, MAP_H);
    }

    // ════════════════════════════════════════════════════════
    // PANEL KIRI: Peta Agen
    // ════════════════════════════════════════════════════════
    function drawMapPanel(dayData) {
      // Background
      p.noStroke();
      p.fill(C.panelBg);
      p.rect(0, 0, LEFT_W, MAP_H);

      // Label hari
      p.fill(C.textSec);
      p.noStroke();
      p.textSize(10);
      p.textAlign(p.LEFT, p.TOP);
      p.text('PETA PELANGGAN', PAD, PAD);
      p.fill(C.textAcc);
      p.textAlign(p.RIGHT, p.TOP);
      p.text(`Hari ${frame + 1} / ${N_DAYS}`, LEFT_W - PAD, PAD);

      const cfg = window.simConfig;

      // Gambar garis antar toko (tipis)
      p.stroke(C.border);
      p.strokeWeight(0.5);
      p.drawingContext.setLineDash([4, 6]);
      p.line(
        toCanvasX(cfg.store_a_x), toCanvasY(cfg.store_a_y),
        toCanvasX(cfg.store_b_x), toCanvasY(cfg.store_b_y)
      );
      p.drawingContext.setLineDash([]);

      // Gambar semua agen
      const agents = window.agentData;
      const d = dayData;
      const total = d.visits_a + d.visits_b + d.no_buy;
      const pA = total > 0 ? d.visits_a / total : 0.4;
      const pB = total > 0 ? d.visits_b / total : 0.4;

      for (let ag of agents) {
        const px = toCanvasX(ag.x);
        const py = toCanvasY(ag.y);

        // Warna agen
        let col;
        if (frame === N_DAYS - 1) {
          // Hari terakhir: pakai data agent asli
          col = ag.choice === 'A' ? C.agentA :
                ag.choice === 'B' ? C.agentB : C.agentNone;
        } else {
          // Hari lain: probabilistic berdasarkan rasio harian
          const r = fract(Math.sin(ag.id * 127.1 + frame * 311.7) * 43758.5453);
          col = r < pA ? C.agentA : r < pA + pB ? C.agentB : C.agentNone;
        }

        // Ukuran titik berdasarkan |memory_a|
        const memMag = Math.abs(ag.memory_a || 0);
        const sz = 4 + memMag * 8;

        // Border kuning jika bad experience hari terakhir
        if (frame === N_DAYS - 1 && ag.had_bad_experience) {
          p.stroke(C.agentBadExp);
          p.strokeWeight(1.5);
        } else {
          p.noStroke();
        }

        p.fill(col);
        p.circle(px, py, sz);
      }

      // Gambar toko di atas agen
      drawStore(cfg.store_a_x, cfg.store_a_y, 'A', C.storeA);
      drawStore(cfg.store_b_x, cfg.store_b_y, 'B', C.storeB);

      // Legend
      drawLegend();
    }

    function drawStore(sx, sy, label, col) {
      const px = toCanvasX(sx);
      const py = toCanvasY(sy);
      p.fill(col);
      p.noStroke();
      p.rect(px - 10, py - 10, 20, 20, 3);
      p.fill(C.textPri);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(10);
      p.text(`Toko ${label}`, px, py - 12);
    }

    function drawLegend() {
      const lx = PAD, ly = MAP_H - 54;
      p.textSize(9);
      p.textAlign(p.LEFT, p.CENTER);

      const items = [
        { col: C.agentA,    label: 'Pilih Toko A (ada jukir)' },
        { col: C.agentB,    label: 'Pilih Toko B (tanpa jukir)' },
        { col: C.agentNone, label: 'Tidak jadi beli' },
      ];
      items.forEach((item, i) => {
        p.fill(item.col);
        p.noStroke();
        p.circle(lx + 5, ly + i * 14, 7);
        p.fill(C.textSec);
        p.text(item.label, lx + 14, ly + i * 14);
      });
    }

    // Koordinat meter → pixel canvas panel kiri
    function toCanvasX(simX) {
      const cfg = window.simConfig;
      const minX = Math.min(cfg.store_a_x, cfg.store_b_x) - cfg.market_radius;
      const maxX = Math.max(cfg.store_a_x, cfg.store_b_x) + cfg.market_radius;
      return p.map(simX, minX, maxX, PAD + 8, LEFT_W - PAD - 8);
    }
    function toCanvasY(simY) {
      const cfg = window.simConfig;
      return p.map(simY, -cfg.market_radius, cfg.market_radius, MAP_H - PAD - 24, PAD + 24);
    }

    // Hash deterministik [0,1] untuk coloring agen
    function fract(x) { return x - Math.floor(x); }

    // ════════════════════════════════════════════════════════
    // PANEL KANAN: Chart Time Series
    // ════════════════════════════════════════════════════════
    function drawChartPanel() {
      // Background
      p.noStroke();
      p.fill(C.panelBg);
      p.rect(LEFT_W, 0, RIGHT_W, CHART_H);

      // Label
      p.fill(C.textSec);
      p.textSize(10);
      p.textAlign(p.LEFT, p.TOP);
      p.text('KUNJUNGAN HARIAN', LEFT_W + PAD, PAD);

      // Area chart
      const cx0 = LEFT_W + 36, cx1 = W - 10;
      const cy0 = PAD + 20, cy1 = CHART_H - 44;
      const cw = cx1 - cx0, ch = cy1 - cy0;

      // Max visits untuk scaling
      const allDays = window.abmDaily;
      const maxV = Math.max(...allDays.map(d => Math.max(d.visits_a, d.visits_b))) * 1.15 || 100;

      // Grid lines horizontal
      p.stroke(C.chartGrid);
      p.strokeWeight(0.5);
      for (let i = 0; i <= 4; i++) {
        const gy = cy0 + (ch / 4) * i;
        p.line(cx0, gy, cx1, gy);
        p.fill(C.textSec);
        p.noStroke();
        p.textSize(8);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(Math.round(maxV - (maxV / 4) * i), cx0 - 3, gy);
      }

      // Garis kunjungan A (merah)
      plotLine(allDays, 'visits_a', maxV, cx0, cy0, cw, ch, C.lineA, false);

      // Garis kunjungan B (hijau)
      plotLine(allDays, 'visits_b', maxV, cx0, cy0, cw, ch, C.lineB, false);

      // Garis avg_memory_a (ungu, putus-putus, axis sendiri range [-1,0])
      p.drawingContext.setLineDash([5, 5]);
      plotLine(allDays, 'avg_memory_a', 0, cx0, cy0, cw, ch, C.lineMemory, true);
      p.drawingContext.setLineDash([]);

      // Marker hari saat ini
      if (frame < N_DAYS) {
        const markerX = cx0 + (frame / (N_DAYS - 1)) * cw;
        p.stroke(p.color('#ffffff33'));
        p.strokeWeight(1);
        p.line(markerX, cy0, markerX, cy1);
      }

      // Label sumbu X
      p.fill(C.textSec);
      p.noStroke();
      p.textSize(8);
      p.textAlign(p.LEFT, p.TOP);
      p.text('1', cx0, cy1 + 3);
      p.textAlign(p.RIGHT, p.TOP);
      p.text(`${N_DAYS}`, cx1, cy1 + 3);
      p.textAlign(p.CENTER, p.TOP);
      p.text('Hari', cx0 + cw/2, cy1 + 3);

      // Legend chart
      const legY = CHART_H - 18;
      drawChartLegend(LEFT_W + PAD, legY);
    }

    function plotLine(data, key, maxVal, cx0, cy0, cw, ch, col, isMemory) {
      p.stroke(col);
      p.strokeWeight(1.8);
      p.noFill();
      p.beginShape();
      for (let i = 0; i <= frame && i < N_DAYS; i++) {
        const x = cx0 + (i / Math.max(N_DAYS - 1, 1)) * cw;
        let y;
        if (isMemory) {
          // memory range [-1, 0] → mapped ke [cy0, cy1]
          y = p.map(data[i][key], -1, 0, cy0 + ch, cy0);
        } else {
          y = cy0 + ch - (data[i][key] / maxVal) * ch;
        }
        p.vertex(x, y);
      }
      p.endShape();
    }

    function drawChartLegend(lx, ly) {
      const items = [
        { col: C.lineA,      label: 'Kunjungan A' },
        { col: C.lineB,      label: 'Kunjungan B' },
        { col: C.lineMemory, label: 'Avg Memory A' },
      ];
      let ox = lx;
      items.forEach(item => {
        p.stroke(item.col);
        p.strokeWeight(2);
        p.line(ox, ly, ox + 14, ly);
        p.noStroke();
        p.fill(C.textSec);
        p.textSize(8);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(item.label, ox + 17, ly);
        ox += 90;
      });
    }

    // ════════════════════════════════════════════════════════
    // HUD BAWAH: Stats
    // ════════════════════════════════════════════════════════
    function drawHUD(d) {
      const hudY = MAP_H;
      const hudH = H - MAP_H;

      p.noStroke();
      p.fill(C.hudBg);
      p.rect(0, hudY, W, hudH);

      // Separator
      p.stroke(C.border);
      p.strokeWeight(1);
      p.line(0, hudY, W, hudY);

      // Stats
      const stats = [
        ['Hari',      `${frame + 1} / ${N_DAYS}`],
        ['Rev Toko A', fmtRp(d.revenue_a)],
        ['Rev Toko B', fmtRp(d.revenue_b)],
        ['WOM',        d.wom_messages],
        ['Bad Exp',    d.bad_experiences],
        ['Avg Mem A',  (d.avg_memory_a || 0).toFixed(3)],
      ];

      const colW = W / stats.length;
      stats.forEach((s, i) => {
        const cx = i * colW + colW / 2;
        p.noStroke();
        p.fill(C.textSec);
        p.textSize(8);
        p.textAlign(p.CENTER, p.TOP);
        p.text(s[0].toUpperCase(), cx, hudY + 6);
        p.fill(i < 3 ? C.textAcc : C.textPri);
        p.textSize(12);
        p.text(s[1], cx, hudY + 18);
      });
    }

    // ── Helpers ─────────────────────────────────────────────
    function fmtRp(val) {
      if (!val) return 'Rp0';
      if (val >= 1_000_000) return `Rp${(val/1_000_000).toFixed(2)}jt`;
      return `Rp${Math.round(val/1000)}rb`;
    }

  }); // end new p5
  </script>

</body>
</html>
```

---

## Integrasi di `app.py`

```python
from pathlib import Path
import json
import streamlit.components.v1 as components

def render_abm_animation(abm_daily: list, agent_snapshots: list,
                          dcm_results: dict, sim_config: dict):
    """Render animasi p5.js dengan data dari ABM + DCM."""

    template = (
        Path(__file__).parent / "components" / "minimarket_animation.html"
    ).read_text(encoding="utf-8")

    # Downsample agen jika lebih dari 500 (performa)
    if len(agent_snapshots) > 500:
        import random; random.seed(42)
        agent_snapshots = random.sample(agent_snapshots, 500)

    html = template \
        .replace("'__ABM_DAILY__'",  json.dumps(abm_daily)) \
        .replace("'__AGENTS__'",     json.dumps(agent_snapshots)) \
        .replace("'__DCM__'",        json.dumps(dcm_results)) \
        .replace("'__CONFIG__'",     json.dumps(sim_config))

    components.html(html, height=600, scrolling=False)
```
