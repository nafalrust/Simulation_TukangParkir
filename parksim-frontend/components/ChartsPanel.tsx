'use client';

import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Label,
} from 'recharts';
import { useSimulationStore } from '@/lib/simulationStore';

// ─── Shared styles ────────────────────────────────────────────────────────────
const TOOLTIP = {
  contentStyle: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 },
  labelStyle: { color: '#374151', fontWeight: 600 },
};
const TICK = { fill: '#6b7280', fontSize: 10 };
const GRID = '#e5e7eb';

function fmtRp(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `${(v / 1000).toFixed(0)}rb`;
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="mb-3">
        <h3 className="text-gray-800 text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-gray-400 text-[10px] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function NoData() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
      <div className="text-4xl mb-3">📊</div>
      <p className="text-sm font-medium">Belum ada data simulasi</p>
      <p className="text-xs mt-1">Jalankan simulasi terlebih dahulu dari tab "3D Scene"</p>
    </div>
  );
}

// ─── Chart 1: Kunjungan Harian ────────────────────────────────────────────────
function VisitChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;
  return (
    <ChartCard
      title="📊 Kunjungan Harian per Toko"
      subtitle="Jumlah agen yang berbelanja ke Toko A dan B setiap hari simulasi"
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.abm_daily} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} />
          <Tooltip {...TOOLTIP} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="visits_a" name="Toko A (ada jukir)" stroke="#ef4444" dot={false} strokeWidth={2} />
          <Line dataKey="visits_b" name="Toko B (aman)"      stroke="#22c55e" dot={false} strokeWidth={2} />
          <Line dataKey="no_buy"   name="Tidak beli"         stroke="#94a3b8" dot={false} strokeWidth={1.5} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 2: Revenue Kumulatif ───────────────────────────────────────────────
function CumulativeRevenueChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  let cumA = 0, cumB = 0;
  const cumData = data.abm_daily.map((d) => {
    cumA += d.revenue_a;
    cumB += d.revenue_b;
    return { day: d.day, cum_a: cumA, cum_b: cumB, gap: cumA - cumB };
  });

  return (
    <ChartCard
      title="💰 Revenue Kumulatif"
      subtitle="Total pendapatan yang terakumulasi sepanjang simulasi (Rp)"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={cumData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [`Rp ${fmtRp(Number(v))}`]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area dataKey="cum_a" name="Toko A" stroke="#ef4444" fill="#fecaca" fillOpacity={0.3} strokeWidth={2} />
          <Area dataKey="cum_b" name="Toko B" stroke="#22c55e" fill="#bbf7d0" fillOpacity={0.3} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 3: Revenue Harian ──────────────────────────────────────────────────
function DailyRevenueChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;
  return (
    <ChartCard
      title="💵 Revenue Harian per Toko"
      subtitle="Pendapatan Toko A vs B per hari (Rp)"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.abm_daily} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [`Rp ${fmtRp(Number(v))}`]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="revenue_a" name="Toko A" fill="#ef4444" opacity={0.85} />
          <Bar dataKey="revenue_b" name="Toko B" fill="#22c55e" opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 4: WOM & Bad Experience ───────────────────────────────────────────
function WOMChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;
  return (
    <ChartCard
      title="📣 WOM & Bad Experience Harian"
      subtitle="Jumlah pesan word-of-mouth dan pengalaman buruk jukir per hari"
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.abm_daily} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} />
          <Tooltip {...TOOLTIP} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="wom_messages"   name="Pesan WOM"      stroke="#f59e0b" dot={false} strokeWidth={2} />
          <Line dataKey="bad_experiences" name="Bad Experience" stroke="#f97316" dot={false} strokeWidth={2} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 5: Rata-rata Memory / Perceived Risk Toko A ───────────────────────
function MemoryChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const chartData = data.abm_daily.map((d) => ({
    day: d.day,
    avg_risk: Math.abs(d.avg_memory_a),   // tampilkan sebagai positif (0..1)
  }));

  return (
    <ChartCard
      title="🧠 Rata-rata Persepsi Risiko Toko A"
      subtitle="Rata-rata perceived_risk_a semua agen per hari (semakin tinggi = agen makin takut jukir)"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [Number(v).toFixed(4), "Avg Risk A"]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <ReferenceLine y={0.5} stroke="#a78bfa" strokeDasharray="4 4">
            <Label value="Risk = 0.5" position="right" style={{ fill: '#a78bfa', fontSize: 9 }} />
          </ReferenceLine>
          <Area dataKey="avg_risk" name="Avg Perceived Risk A" stroke="#a78bfa" fill="#ede9fe" fillOpacity={0.5} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 6: Market Share ────────────────────────────────────────────────────
function MarketShareChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const chartData = data.abm_daily.map((d) => {
    const total = d.visits_a + d.visits_b || 1;
    return {
      day: d.day,
      share_a: Math.round((d.visits_a / total) * 100),
      share_b: Math.round((d.visits_b / total) * 100),
    };
  });

  return (
    <ChartCard
      title="📈 Market Share Harian (%)"
      subtitle="Proporsi kunjungan Toko A vs B dari total agen yang berbelanja hari itu"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [`${Number(v)}%`]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area dataKey="share_a" name="Toko A" stackId="1" stroke="#ef4444" fill="#fecaca" strokeWidth={2} />
          <Area dataKey="share_b" name="Toko B" stackId="1" stroke="#22c55e" fill="#bbf7d0" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 7: Scatter — parking_aversion vs memory_a per agen ────────────────
function AgentScatterChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const byChoice = {
    A:    data.agent_snapshots.filter((a) => a.choice === 'A').map((a) => ({ x: a.parking_aversion, y: Math.abs(a.memory_a), z: 5 })),
    B:    data.agent_snapshots.filter((a) => a.choice === 'B').map((a) => ({ x: a.parking_aversion, y: Math.abs(a.memory_a), z: 5 })),
    none: data.agent_snapshots.filter((a) => a.choice === 'none').map((a) => ({ x: a.parking_aversion, y: Math.abs(a.memory_a), z: 5 })),
  };

  return (
    <ChartCard
      title="🔍 Distribusi Agen: Parking Aversion vs Perceived Risk"
      subtitle="Scatter agen berdasarkan aversion & risk akhir hari terakhir simulasi"
    >
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis type="number" dataKey="x" name="Parking Aversion" domain={[0, 1]} stroke="#d1d5db" tick={TICK}>
            <Label value="Parking Aversion" position="insideBottom" offset={-10} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis type="number" dataKey="y" name="Perceived Risk A" domain={[0, 1]} stroke="#d1d5db" tick={TICK}>
            <Label value="Risk A" angle={-90} position="insideLeft" style={{ fill: '#9ca3af', fontSize: 10 }} />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[20, 40]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-gray-200 rounded p-2 text-xs shadow">
                  <p>Aversion: {d.x.toFixed(2)}</p>
                  <p>Risk A: {d.y.toFixed(3)}</p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Scatter name="Pilih A" data={byChoice.A}    fill="#ef4444" opacity={0.6} />
          <Scatter name="Pilih B" data={byChoice.B}    fill="#22c55e" opacity={0.6} />
          <Scatter name="Tidak beli" data={byChoice.none} fill="#94a3b8" opacity={0.5} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Summary Stats Cards ──────────────────────────────────────────────────────
function SummaryCards() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const daily = data.abm_daily;
  const totalRevA = daily.reduce((s, d) => s + d.revenue_a, 0);
  const totalRevB = daily.reduce((s, d) => s + d.revenue_b, 0);
  const totalWOM  = daily.reduce((s, d) => s + d.wom_messages, 0);
  const totalBad  = daily.reduce((s, d) => s + d.bad_experiences, 0);
  const avgVisitA = (daily.reduce((s, d) => s + d.visits_a, 0) / daily.length).toFixed(1);
  const avgVisitB = (daily.reduce((s, d) => s + d.visits_b, 0) / daily.length).toFixed(1);
  const lastRisk  = Math.abs(daily[daily.length - 1].avg_memory_a).toFixed(3);
  const revLoss   = totalRevA > 0
    ? `${(((totalRevB - totalRevA) / totalRevA) * 100).toFixed(1)}%`
    : '-';

  const cards = [
    { label: 'Total Rev Toko A', value: `Rp ${fmtRp(totalRevA)}`, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
    { label: 'Total Rev Toko B', value: `Rp ${fmtRp(totalRevB)}`, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
    { label: 'Selisih Rev (B-A)', value: `Rp ${fmtRp(Math.abs(totalRevB - totalRevA))}`, color: totalRevB > totalRevA ? 'text-green-700' : 'text-red-700', bg: 'bg-gray-50 border-gray-100' },
    { label: 'Rata-rata Kunjungan A/hari', value: avgVisitA, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
    { label: 'Rata-rata Kunjungan B/hari', value: avgVisitB, color: 'text-green-500', bg: 'bg-green-50 border-green-100' },
    { label: 'Total WOM Tersebar', value: totalWOM.toLocaleString(), color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100' },
    { label: 'Total Bad Experience', value: totalBad.toLocaleString(), color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
    { label: 'Perceived Risk Akhir', value: lastRisk, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.bg} px-4 py-3`}>
          <p className="text-gray-500 text-[9px] uppercase tracking-wider">{c.label}</p>
          <p className={`text-lg font-bold font-mono ${c.color} mt-0.5`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── DCM Results ─────────────────────────────────────────────────────────────
function DCMSection() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;
  const dcm = data.dcm_results;
  const cfg = data.sim_config;

  return (
    <ChartCard
      title="🔬 Hasil Estimasi DCM (Discrete Choice Model — Multinomial Logit)"
      subtitle="Parameter preferensi konsumen diestimasi dari survei Stated Preference (Q1–Q8). β negatif = atribut menurunkan utilitas."
    >
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'β Jarak', value: dcm.beta_jarak.toFixed(4), hint: `p = ${dcm.p_value_jarak.toFixed(3)}`, note: 'per meter', color: 'text-red-600' },
          { label: 'β Jukir', value: dcm.beta_parkir.toFixed(4), hint: `p = ${dcm.p_value_parkir.toFixed(3)}`, note: 'ada/tidak jukir', color: 'text-red-600' },
          { label: "McFadden R²", value: dcm.pseudo_r2.toFixed(3), hint: '>0.2 = fit baik', note: 'model fit', color: 'text-green-600' },
          { label: 'Log-Likelihood', value: dcm.log_likelihood.toFixed(1), hint: '', note: '', color: 'text-blue-600' },
          { label: 'N Responden', value: String(dcm.n_respondents), hint: 'survei SP', note: '', color: 'text-gray-700' },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
            <p className="text-gray-400 text-[9px] uppercase tracking-wider">{item.label}</p>
            <p className={`text-base font-bold font-mono ${item.color}`}>{item.value}</p>
            {item.hint && <p className="text-gray-400 text-[9px]">{item.hint}</p>}
            {item.note && <p className="text-gray-300 text-[8px]">{item.note}</p>}
          </div>
        ))}
      </div>
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-blue-700 text-xs font-medium mb-1">Interpretasi:</p>
        <p className="text-blue-600 text-[10px] leading-relaxed">
          Utilitas agen: <span className="font-mono">V = {dcm.beta_jarak.toFixed(4)}×jarak + {dcm.beta_parkir.toFixed(4)}×ada_jukir + ε</span>
          {' '}— Toko A (ada jukir) memiliki utilitas lebih rendah sebesar <span className="font-mono">{Math.abs(dcm.beta_parkir).toFixed(3)}</span> unit.
          Jarak antar toko {cfg.store_b_x}m mengurangi utilitas sebesar{' '}
          <span className="font-mono">{Math.abs(dcm.beta_jarak * cfg.store_b_x).toFixed(3)}</span> unit.
        </p>
      </div>
    </ChartCard>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export function ChartsPanel() {
  const data = useSimulationStore((s) => s.data);

  if (!data) return <NoData />;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-5 space-y-5">
      {/* Summary stats */}
      <div>
        <h2 className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-3">
          Ringkasan Hasil Simulasi ({data.sim_config.n_agents} agen, {data.sim_config.n_days} hari)
        </h2>
        <SummaryCards />
      </div>

      {/* Charts 2-col grid */}
      <div className="grid grid-cols-2 gap-5">
        <VisitChart />
        <MarketShareChart />
        <DailyRevenueChart />
        <CumulativeRevenueChart />
        <WOMChart />
        <MemoryChart />
      </div>

      {/* Full-width charts */}
      <AgentScatterChart />
      <DCMSection />
    </div>
  );
}
