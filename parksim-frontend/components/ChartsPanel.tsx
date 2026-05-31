'use client';

import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Label,
} from 'recharts';
import { useSimulationStore } from '@/lib/simulationStore';
import { DayData } from '@/lib/api';

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

// Hari di mana revenue A pertama kali lebih rendah dari B secara konsisten (3 hari berturut)
function findCriticalDay(daily: DayData[]): number | null {
  let streak = 0;
  for (let i = 0; i < daily.length; i++) {
    if (daily[i].revenue_a < daily[i].revenue_b) {
      streak++;
      if (streak >= 3) return daily[i - 2].day;
    } else {
      streak = 0;
    }
  }
  return null;
}

function ChartCard({ title, subtitle, children, badge }: {
  title: string; subtitle?: string; children: React.ReactNode; badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-gray-800 text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-gray-400 text-[10px] mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function DayBadge({ frame, nDays }: { frame: number; nDays: number }) {
  return (
    <span className="flex-none bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
      Hari {frame + 1} / {nDays}
    </span>
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

// Kursor vertikal custom untuk menandai hari aktif di chart
function ActiveDayCursor({ x, y, height }: { x?: number; y?: number; height?: number }) {
  if (x == null || y == null || height == null) return null;
  return <line x1={x} y1={y} x2={x} y2={y + height} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" />;
}

// ─── Chart 1: Kunjungan Harian ────────────────────────────────────────────────
function VisitChart({ visibleData, allData, frame, nDays, criticalDay }: ChartProps) {
  return (
    <ChartCard
      title="📊 Kunjungan Harian per Toko"
      subtitle="Jumlah agen yang berbelanja ke Toko A dan B setiap hari"
      badge={<DayBadge frame={frame} nDays={nDays} />}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={visibleData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} domain={[1, allData.length]}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} />
          <Tooltip {...TOOLTIP} labelFormatter={(l) => `Hari ke-${l}`} cursor={<ActiveDayCursor />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine x={criticalDay} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5}>
              <Label value={`⚠ Hari ${criticalDay}`} position="top" style={{ fill: '#d97706', fontSize: 9 }} />
            </ReferenceLine>
          )}
          <Line dataKey="visits_a" name="Toko A (ada jukir)" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="visits_b" name="Toko B (aman)"      stroke="#22c55e" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="no_buy"   name="Tidak beli"         stroke="#94a3b8" dot={false} strokeWidth={1.5} strokeDasharray="4 4" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 2: Revenue Kumulatif ───────────────────────────────────────────────
function CumulativeRevenueChart({ visibleData, allData, frame, nDays, criticalDay }: ChartProps) {
  let cumA = 0, cumB = 0;
  const cumData = visibleData.map((d) => {
    cumA += d.revenue_a;
    cumB += d.revenue_b;
    return { day: d.day, cum_a: cumA, cum_b: cumB };
  });

  const lastCumA = cumData[cumData.length - 1]?.cum_a ?? 0;
  const lastCumB = cumData[cumData.length - 1]?.cum_b ?? 0;
  const ahead = lastCumB > lastCumA
    ? `B unggul Rp ${fmtRp(lastCumB - lastCumA)}`
    : lastCumA > lastCumB
    ? `A unggul Rp ${fmtRp(lastCumA - lastCumB)}`
    : 'Seimbang';

  return (
    <ChartCard
      title="💰 Revenue Kumulatif"
      subtitle="Total pendapatan terakumulasi sepanjang simulasi (Rp)"
      badge={
        <span className={`flex-none text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
          lastCumB > lastCumA ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>{ahead}</span>
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={cumData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} domain={[1, allData.length]}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [`Rp ${fmtRp(Number(v))}`]}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine x={criticalDay} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5}>
              <Label value={`⚠ Hari ${criticalDay}`} position="top" style={{ fill: '#d97706', fontSize: 9 }} />
            </ReferenceLine>
          )}
          <Area dataKey="cum_a" name="Toko A" stroke="#ef4444" fill="#fecaca" fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
          <Area dataKey="cum_b" name="Toko B" stroke="#22c55e" fill="#bbf7d0" fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 3: Revenue Harian ──────────────────────────────────────────────────
function DailyRevenueChart({ visibleData, allData, frame, nDays, criticalDay }: ChartProps) {
  const today = visibleData[visibleData.length - 1];
  const deltaToday = today ? today.revenue_b - today.revenue_a : 0;

  return (
    <ChartCard
      title="💵 Revenue Harian per Toko"
      subtitle="Pendapatan Toko A vs B per hari (Rp)"
      badge={
        today && (
          <span className={`flex-none text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
            deltaToday > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {deltaToday > 0 ? `B+${fmtRp(deltaToday)}` : `A+${fmtRp(-deltaToday)}`}
          </span>
        )
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={visibleData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [`Rp ${fmtRp(Number(v))}`]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine x={criticalDay} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} />
          )}
          <Bar dataKey="revenue_a" name="Toko A" fill="#ef4444" opacity={0.85} isAnimationActive={false} />
          <Bar dataKey="revenue_b" name="Toko B" fill="#22c55e" opacity={0.85} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 4: WOM & Bad Experience ───────────────────────────────────────────
function WOMChart({ visibleData, allData, frame, nDays }: ChartProps) {
  const today = visibleData[visibleData.length - 1];
  return (
    <ChartCard
      title="📣 WOM & Bad Experience Harian"
      subtitle="Pesan word-of-mouth dan pengalaman buruk jukir per hari"
      badge={
        today && (
          <span className="flex-none bg-yellow-50 border border-yellow-200 text-yellow-700 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
            WOM: {today.wom_messages} | Bad: {today.bad_experiences}
          </span>
        )
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={visibleData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} />
          <Tooltip {...TOOLTIP} labelFormatter={(l) => `Hari ke-${l}`} cursor={<ActiveDayCursor />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="wom_messages"    name="Pesan WOM"      stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="bad_experiences" name="Bad Experience" stroke="#f97316" dot={false} strokeWidth={2} strokeDasharray="5 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 5: Risk & Aversion ─────────────────────────────────────────────────
function RiskAversionChart({ visibleData, allData, frame, nDays }: ChartProps) {
  const today = visibleData[visibleData.length - 1];
  const chartData = visibleData.map((d) => ({
    day: d.day,
    avg_risk_a: d.avg_risk_a,
    avg_aversion: d.avg_parking_aversion,
  }));

  return (
    <ChartCard
      title="🧠 Rata-rata Perceived Risk & Parking Aversion"
      subtitle="Dinamika persepsi risiko Toko A dan aversion agen (0–1)"
      badge={
        today && (
          <span className="flex-none bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
            Risk: {today.avg_risk_a.toFixed(3)}
          </span>
        )
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip {...TOOLTIP}
            formatter={(v, name) => [Number(v).toFixed(4), name]}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0.5} stroke="#a78bfa" strokeDasharray="4 4">
            <Label value="0.5" position="right" style={{ fill: '#a78bfa', fontSize: 9 }} />
          </ReferenceLine>
          <Area dataKey="avg_risk_a"   name="Avg Perceived Risk A" stroke="#a78bfa" fill="#ede9fe" fillOpacity={0.5} strokeWidth={2} isAnimationActive={false} />
          <Area dataKey="avg_aversion" name="Avg Parking Aversion" stroke="#f97316" fill="#fed7aa" fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 6: Market Share ────────────────────────────────────────────────────
function MarketShareChart({ visibleData, allData, frame, nDays, criticalDay }: ChartProps) {
  const chartData = visibleData.map((d) => {
    const total = d.visits_a + d.visits_b || 1;
    return {
      day: d.day,
      share_a: Math.round((d.visits_a / total) * 100),
      share_b: Math.round((d.visits_b / total) * 100),
    };
  });
  const today = chartData[chartData.length - 1];

  return (
    <ChartCard
      title="📈 Market Share Harian (%)"
      subtitle="Proporsi kunjungan Toko A vs B dari agen yang berbelanja hari itu"
      badge={
        today && (
          <span className={`flex-none text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
            today.share_b > today.share_a ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            A:{today.share_a}% · B:{today.share_b}%
          </span>
        )
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [`${Number(v)}%`]}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine x={criticalDay} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} />
          )}
          <Area dataKey="share_a" name="Toko A" stackId="1" stroke="#ef4444" fill="#fecaca" strokeWidth={2} isAnimationActive={false} />
          <Area dataKey="share_b" name="Toko B" stackId="1" stroke="#22c55e" fill="#bbf7d0" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 7: Scatter — parking_aversion vs perceived_risk_a ─────────────────
// Scatter tidak ikut frame (data per-agen hanya ada di hari terakhir)
function AgentScatterChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const byChoice = {
    A:    data.agent_snapshots.filter((a) => a.choice === 'A').map((a) => ({ x: a.parking_aversion, y: a.perceived_risk_a, z: 5 })),
    B:    data.agent_snapshots.filter((a) => a.choice === 'B').map((a) => ({ x: a.parking_aversion, y: a.perceived_risk_a, z: 5 })),
    none: data.agent_snapshots.filter((a) => a.choice === 'none').map((a) => ({ x: a.parking_aversion, y: a.perceived_risk_a, z: 5 })),
  };

  return (
    <ChartCard
      title="🔍 Distribusi Agen: Parking Aversion vs Perceived Risk A"
      subtitle="Snapshot hari terakhir simulasi — agen ber-aversion tinggi cenderung pilih B"
    >
      <ResponsiveContainer width="100%" height={260}>
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
                  <p>Aversion: {d.x.toFixed(3)}</p>
                  <p>Risk A: {d.y.toFixed(3)}</p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Scatter name="Pilih A"     data={byChoice.A}    fill="#ef4444" opacity={0.6} />
          <Scatter name="Pilih B"     data={byChoice.B}    fill="#22c55e" opacity={0.6} />
          <Scatter name="Tidak beli"  data={byChoice.none} fill="#94a3b8" opacity={0.5} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Summary Stats Cards (ikut frame) ────────────────────────────────────────
function SummaryCards({ visibleData, frame, nDays }: { visibleData: DayData[]; frame: number; nDays: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const totalRevA  = visibleData.reduce((s, d) => s + d.revenue_a, 0);
  const totalRevB  = visibleData.reduce((s, d) => s + d.revenue_b, 0);
  const totalWOM   = visibleData.reduce((s, d) => s + d.wom_messages, 0);
  const totalBad   = visibleData.reduce((s, d) => s + d.bad_experiences, 0);
  const avgVisitA  = visibleData.length ? (visibleData.reduce((s, d) => s + d.visits_a, 0) / visibleData.length).toFixed(1) : '—';
  const avgVisitB  = visibleData.length ? (visibleData.reduce((s, d) => s + d.visits_b, 0) / visibleData.length).toFixed(1) : '—';
  const lastRisk   = visibleData[visibleData.length - 1]?.avg_risk_a.toFixed(3) ?? '—';
  const lastAvers  = visibleData[visibleData.length - 1]?.avg_parking_aversion.toFixed(3) ?? '—';
  const revGap     = Math.abs(totalRevB - totalRevA);

  const cards = [
    { label: 'Rev Toko A s.d. hari ini',  value: `Rp ${fmtRp(totalRevA)}`,  color: 'text-red-600',    bg: 'bg-red-50 border-red-100'       },
    { label: 'Rev Toko B s.d. hari ini',  value: `Rp ${fmtRp(totalRevB)}`,  color: 'text-green-600',  bg: 'bg-green-50 border-green-100'   },
    { label: 'Selisih Rev (B−A)',          value: `Rp ${fmtRp(revGap)}`,
      color: totalRevB > totalRevA ? 'text-green-700' : 'text-red-700',
      bg: totalRevB > totalRevA ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100',
    },
    { label: 'Avg Kunjungan A/hari',       value: avgVisitA,                  color: 'text-red-500',    bg: 'bg-red-50 border-red-100'       },
    { label: 'Avg Kunjungan B/hari',       value: avgVisitB,                  color: 'text-green-500',  bg: 'bg-green-50 border-green-100'   },
    { label: 'Total WOM s.d. hari ini',    value: totalWOM.toLocaleString(),  color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100' },
    { label: 'Total Bad Exp s.d. ini',     value: totalBad.toLocaleString(),  color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
    { label: 'Perceived Risk A (skrg)',    value: lastRisk,                   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
    { label: 'Avg Aversion (skrg)',        value: lastAvers,                  color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.bg} px-4 py-3`}>
          <p className="text-gray-500 text-[9px] uppercase tracking-wider">{c.label}</p>
          <p className={`text-lg font-bold font-mono ${c.color} mt-0.5`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Model Parameters Section ─────────────────────────────────────────────────
function ModelParamsSection() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;
  const mp  = data.model_params;
  const cfg = data.sim_config;

  const lastDay        = data.abm_daily[data.abm_daily.length - 1];
  const avgAvers       = lastDay.avg_parking_aversion;
  const avgRisk        = lastDay.avg_risk_a;
  const parkingFeeScore = mp.parking_fee / 200_000;
  const exampleDistA   = cfg.store_a_x;
  const exampleDistB   = cfg.store_b_x / 2;

  const scoreA = mp.weight_distance * exampleDistA
    + mp.weight_parking_aversion * avgAvers
    + mp.weight_parking_fee * parkingFeeScore
    + mp.weight_risk * avgRisk
    + mp.weight_attractiveness * mp.attractiveness_A;

  const scoreB = mp.weight_distance * exampleDistB
    + mp.weight_attractiveness * mp.attractiveness_B;

  const maxScore = Math.max(scoreA, scoreB);
  const expA = Math.exp(scoreA - maxScore);
  const expB = Math.exp(scoreB - maxScore);
  const probA = expA / (expA + expB);

  return (
    <ChartCard
      title="🔬 Parameter Model ABM — Weighted Scoring + Softmax"
      subtitle="Bobot dan parameter yang digunakan untuk menghitung probabilitas pilihan toko setiap agen setiap hari."
    >
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[
          { label: 'w_distance',   value: mp.weight_distance.toFixed(3),         note: 'per meter',        color: 'text-red-600'    },
          { label: 'w_aversion',   value: mp.weight_parking_aversion.toFixed(1),  note: 'parking_aversion', color: 'text-red-600'    },
          { label: 'w_fee',        value: mp.weight_parking_fee.toFixed(1),        note: 'fee/200rb',        color: 'text-red-600'    },
          { label: 'w_risk',       value: mp.weight_risk.toFixed(1),               note: 'perceived_risk_a', color: 'text-red-600'    },
          { label: 'w_attract',    value: mp.weight_attractiveness.toFixed(1),     note: 'attractiveness',   color: 'text-green-600'  },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
            <p className="text-gray-400 text-[9px] uppercase tracking-wider">{item.label}</p>
            <p className={`text-base font-bold font-mono ${item.color}`}>{item.value}</p>
            <p className="text-gray-300 text-[8px]">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-3">
        <p className="text-blue-700 text-xs font-medium mb-1">Fungsi Skor (agen rata-rata hari terakhir):</p>
        <p className="text-blue-600 text-[10px] leading-relaxed font-mono">
          score_A = {mp.weight_distance}×dist_A + {mp.weight_parking_aversion}×{avgAvers.toFixed(3)} + {mp.weight_parking_fee}×{parkingFeeScore.toFixed(4)} + {mp.weight_risk}×{avgRisk.toFixed(3)} + {mp.weight_attractiveness}×{mp.attractiveness_A} = <span className="font-bold text-blue-800">{scoreA.toFixed(3)}</span>
        </p>
        <p className="text-blue-600 text-[10px] leading-relaxed font-mono mt-1">
          score_B = {mp.weight_distance}×dist_B + {mp.weight_attractiveness}×{mp.attractiveness_B} = <span className="font-bold text-blue-800">{scoreB.toFixed(3)}</span>
        </p>
      </div>

      <div className="p-3 bg-green-50 rounded-lg border border-green-100 mb-3">
        <p className="text-green-700 text-xs font-medium mb-1">Softmax → P(pilih A) hari terakhir:</p>
        <p className="text-green-600 text-[10px] font-mono">
          P(A) = <span className="font-bold text-green-800">{(probA * 100).toFixed(1)}%</span>
          {'  '}P(B) = <span className="font-bold text-green-800">{((1 - probA) * 100).toFixed(1)}%</span>
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Biaya Parkir',    value: `Rp ${(mp.parking_fee / 1000).toFixed(1)}rb` },
          { label: 'WOM Prob',        value: `${(mp.wom_probability * 100).toFixed(0)}%`   },
          { label: 'WOM Strength',    value: mp.wom_strength.toFixed(3)                     },
          { label: 'Memory Decay',    value: mp.memory_decay.toFixed(3)                     },
          { label: 'Memory Strength', value: mp.memory_strength.toFixed(3)                  },
          { label: 'Attract A',       value: mp.attractiveness_A.toFixed(2)                 },
          { label: 'Attract B',       value: mp.attractiveness_B.toFixed(2)                 },
          { label: 'Jarak A→B',       value: `${cfg.store_b_x.toFixed(0)}m`                },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100">
            <p className="text-gray-400 text-[8px] uppercase tracking-wider">{item.label}</p>
            <p className="text-gray-700 text-xs font-bold font-mono">{item.value}</p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Shared prop type untuk semua chart ──────────────────────────────────────
interface ChartProps {
  visibleData: DayData[];
  allData: DayData[];
  frame: number;
  nDays: number;
  criticalDay: number | null;
}

// ─── Playback mini-control untuk tab Charts ───────────────────────────────────
function ChartPlaybackBar({ frame, nDays }: { frame: number; nDays: number }) {
  const { isPlaying, playbackSpeed, togglePlay, setFrame, setSpeed } = useSimulationStore();
  const pct = nDays > 1 ? (frame / (nDays - 1)) * 100 : 0;

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
      <button onClick={togglePlay}
        className="flex-none w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors font-bold">
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className="flex-1">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono">
          <span>Hari 1</span>
          <span className="text-blue-600 font-semibold">Hari {frame + 1} / {nDays}</span>
          <span>Hari {nDays}</span>
        </div>
        {/* Progress bar klikable */}
        <div
          className="w-full h-2 bg-gray-100 rounded-full cursor-pointer relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setFrame(Math.round(ratio * (nDays - 1)));
          }}
        >
          <div
            className="h-2 bg-blue-500 rounded-full transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-none">
        <span className="text-gray-400 text-[10px]">Kec.</span>
        {[1, 2, 4, 8].map((s) => (
          <button key={s} onClick={() => setSpeed(s)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
              playbackSpeed === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Chart Perbandingan: Revenue A (Ada Jukir vs Tanpa Jukir) ────────────────
function ComparisonRevenueChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  // Merge dua skenario by day, hanya s.d. frame aktif
  const withData    = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  let cumWith = 0, cumWithout = 0;
  const merged = withData.map((d, i) => {
    cumWith    += d.revenue_a;
    cumWithout += withoutData[i]?.revenue_a ?? 0;
    return {
      day: d.day,
      rev_a_dengan:  d.revenue_a,
      rev_a_tanpa:   withoutData[i]?.revenue_a ?? 0,
      cum_dengan:    cumWith,
      cum_tanpa:     cumWithout,
    };
  });

  const lastCumDengan = merged[merged.length - 1]?.cum_dengan ?? 0;
  const lastCumTanpa  = merged[merged.length - 1]?.cum_tanpa  ?? 0;
  const uplift = lastCumDengan > 0
    ? (((lastCumTanpa - lastCumDengan) / lastCumDengan) * 100).toFixed(1)
    : '—';

  return (
    <ChartCard
      title="🔄 Perbandingan Revenue Toko A: Ada Jukir vs Tanpa Jukir"
      subtitle="Membandingkan revenue Toko A pada kondisi ada juru parkir liar vs kondisi jukir dihilangkan (parameter lain identik)"
      badge={
        <span className={`flex-none text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
          lastCumTanpa > lastCumDengan
            ? 'bg-green-50 border-green-300 text-green-700'
            : 'bg-gray-50 border-gray-200 text-gray-600'
        }`}>
          {lastCumTanpa > lastCumDengan ? `+${uplift}% tanpa jukir` : `Tidak signifikan`}
        </span>
      }
    >
      {/* Kumulatif */}
      <p className="text-gray-500 text-[10px] mb-1 font-medium">Revenue Kumulatif Toko A (Rp)</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip {...TOOLTIP}
            formatter={(v, name) => [`Rp ${fmtRp(Number(v))}`, name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area dataKey="cum_dengan" name="Ada Jukir"    stroke="#ef4444" fill="#fecaca" fillOpacity={0.35} strokeWidth={2} isAnimationActive={false} />
          <Area dataKey="cum_tanpa"  name="Tanpa Jukir"  stroke="#3b82f6" fill="#bfdbfe" fillOpacity={0.35} strokeWidth={2} isAnimationActive={false} strokeDasharray="6 3" />
        </AreaChart>
      </ResponsiveContainer>

      {/* Harian */}
      <p className="text-gray-500 text-[10px] mt-4 mb-1 font-medium">Revenue Harian Toko A (Rp)</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip {...TOOLTIP}
            formatter={(v, name) => [`Rp ${fmtRp(Number(v))}`, name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="rev_a_dengan" name="Ada Jukir"   stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="rev_a_tanpa"  name="Tanpa Jukir" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="6 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      {/* Ringkasan selisih */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          {
            label: 'Rev A Ada Jukir (kumulatif)',
            value: `Rp ${fmtRp(lastCumDengan)}`,
            color: 'text-red-600', bg: 'bg-red-50 border-red-100',
          },
          {
            label: 'Rev A Tanpa Jukir (kumulatif)',
            value: `Rp ${fmtRp(lastCumTanpa)}`,
            color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100',
          },
          {
            label: 'Potensi Revenue Hilang',
            value: lastCumTanpa > lastCumDengan
              ? `Rp ${fmtRp(lastCumTanpa - lastCumDengan)}`
              : 'Tidak ada',
            color: lastCumTanpa > lastCumDengan ? 'text-green-700' : 'text-gray-500',
            bg: lastCumTanpa > lastCumDengan ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100',
          },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border ${c.bg} px-4 py-3`}>
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">{c.label}</p>
            <p className={`text-base font-bold font-mono ${c.color} mt-0.5`}>{c.value}</p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Chart Perbandingan Kunjungan A ──────────────────────────────────────────
function ComparisonVisitChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData    = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => ({
    day: d.day,
    visits_dengan: d.visits_a,
    visits_tanpa:  withoutData[i]?.visits_a ?? 0,
  }));

  const avgDengan = merged.length
    ? (merged.reduce((s, d) => s + d.visits_dengan, 0) / merged.length).toFixed(1) : '—';
  const avgTanpa  = merged.length
    ? (merged.reduce((s, d) => s + d.visits_tanpa,  0) / merged.length).toFixed(1) : '—';

  return (
    <ChartCard
      title="👥 Perbandingan Kunjungan Toko A: Ada Jukir vs Tanpa Jukir"
      subtitle="Jumlah agen yang memilih Toko A per hari pada dua skenario"
      badge={
        <div className="flex gap-2 flex-none">
          <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            Ada: {avgDengan}/hari
          </span>
          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            Tanpa: {avgTanpa}/hari
          </span>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} />
          <Tooltip {...TOOLTIP} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="visits_dengan" name="Ada Jukir"   stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="visits_tanpa"  name="Tanpa Jukir" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="6 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart Perbandingan: WOM & Bad Experience ────────────────────────────────
function ComparisonWOMChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData    = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => ({
    day: d.day,
    wom_dengan:  d.wom_messages,
    wom_tanpa:   withoutData[i]?.wom_messages ?? 0,
    bad_dengan:  d.bad_experiences,
    bad_tanpa:   withoutData[i]?.bad_experiences ?? 0,
  }));

  const totalWomDengan = merged.reduce((s, d) => s + d.wom_dengan, 0);
  const totalWomTanpa  = merged.reduce((s, d) => s + d.wom_tanpa,  0);
  const totalBadDengan = merged.reduce((s, d) => s + d.bad_dengan, 0);
  const totalBadTanpa  = merged.reduce((s, d) => s + d.bad_tanpa,  0);

  return (
    <ChartCard
      title="📣 Perbandingan WOM & Bad Experience: Ada Jukir vs Tanpa Jukir"
      subtitle="Seberapa besar dampak sosial (penyebaran cerita negatif & pengalaman buruk) yang hilang jika jukir dihapus"
      badge={
        <div className="flex gap-2 flex-none">
          <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            WOM ada: {totalWomDengan}
          </span>
          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            WOM tanpa: {totalWomTanpa}
          </span>
        </div>
      }
    >
      <p className="text-gray-500 text-[10px] mb-1 font-medium">Pesan WOM per hari</p>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} />
          <Tooltip {...TOOLTIP} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="wom_dengan" name="WOM — Ada Jukir"   stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="wom_tanpa"  name="WOM — Tanpa Jukir" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="6 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-gray-500 text-[10px] mt-3 mb-1 font-medium">Bad Experience per hari</p>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} />
          <Tooltip {...TOOLTIP} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="bad_dengan" name="Bad Exp — Ada Jukir"   stroke="#f97316" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="bad_tanpa"  name="Bad Exp — Tanpa Jukir" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="6 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {[
          { label: 'Total WOM Ada Jukir',   value: totalWomDengan.toLocaleString(), color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100' },
          { label: 'Total WOM Tanpa Jukir',  value: totalWomTanpa.toLocaleString(),  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'     },
          { label: 'Total Bad Exp Ada Jukir',   value: totalBadDengan.toLocaleString(), color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
          { label: 'Total Bad Exp Tanpa Jukir', value: totalBadTanpa.toLocaleString(),  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'     },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border ${c.bg} px-3 py-2.5`}>
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">{c.label}</p>
            <p className={`text-base font-bold font-mono ${c.color} mt-0.5`}>{c.value}</p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Chart Perbandingan: Perceived Risk & Parking Aversion ───────────────────
function ComparisonRiskChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData    = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => ({
    day: d.day,
    risk_dengan:    d.avg_risk_a,
    risk_tanpa:     withoutData[i]?.avg_risk_a ?? 0,
    avers_dengan:   d.avg_parking_aversion,
    avers_tanpa:    withoutData[i]?.avg_parking_aversion ?? 0,
  }));

  const lastRiskDengan  = merged[merged.length - 1]?.risk_dengan  ?? 0;
  const lastRiskTanpa   = merged[merged.length - 1]?.risk_tanpa   ?? 0;
  const lastAversDengan = merged[merged.length - 1]?.avers_dengan ?? 0;
  const lastAversTanpa  = merged[merged.length - 1]?.avers_tanpa  ?? 0;

  return (
    <ChartCard
      title="🧠 Perbandingan Perceived Risk & Parking Aversion: Ada Jukir vs Tanpa Jukir"
      subtitle="Dinamika persepsi risiko dan aversion agen — tanpa jukir keduanya seharusnya mendekati nilai awal"
      badge={
        <div className="flex gap-2 flex-none">
          <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            Risk ada: {lastRiskDengan.toFixed(3)}
          </span>
          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            Risk tanpa: {lastRiskTanpa.toFixed(3)}
          </span>
        </div>
      }
    >
      <p className="text-gray-500 text-[10px] mb-1 font-medium">Avg Perceived Risk A (0–1)</p>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip {...TOOLTIP}
            formatter={(v, name) => [Number(v).toFixed(4), name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0.5} stroke="#a78bfa" strokeDasharray="4 4">
            <Label value="0.5" position="right" style={{ fill: '#a78bfa', fontSize: 9 }} />
          </ReferenceLine>
          <Area dataKey="risk_dengan" name="Risk A — Ada Jukir"   stroke="#a78bfa" fill="#ede9fe" fillOpacity={0.4} strokeWidth={2} isAnimationActive={false} />
          <Area dataKey="risk_tanpa"  name="Risk A — Tanpa Jukir" stroke="#3b82f6" fill="#bfdbfe" fillOpacity={0.2} strokeWidth={2} strokeDasharray="6 3" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-gray-500 text-[10px] mt-3 mb-1 font-medium">Avg Parking Aversion (0–1)</p>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK} />
          <YAxis stroke="#d1d5db" tick={TICK} domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip {...TOOLTIP}
            formatter={(v, name) => [Number(v).toFixed(4), name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area dataKey="avers_dengan" name="Aversion — Ada Jukir"   stroke="#f97316" fill="#fed7aa" fillOpacity={0.4} strokeWidth={2} isAnimationActive={false} />
          <Area dataKey="avers_tanpa"  name="Aversion — Tanpa Jukir" stroke="#3b82f6" fill="#bfdbfe" fillOpacity={0.2} strokeWidth={2} strokeDasharray="6 3" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {[
          { label: 'Risk Akhir Ada Jukir',    value: lastRiskDengan.toFixed(3),  color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
          { label: 'Risk Akhir Tanpa Jukir',  value: lastRiskTanpa.toFixed(3),   color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'     },
          { label: 'Aversion Akhir Ada Jukir',   value: lastAversDengan.toFixed(3), color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
          { label: 'Aversion Akhir Tanpa Jukir', value: lastAversTanpa.toFixed(3),  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'     },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border ${c.bg} px-3 py-2.5`}>
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">{c.label}</p>
            <p className={`text-base font-bold font-mono ${c.color} mt-0.5`}>{c.value}</p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Chart Perbandingan: Market Share Toko A ─────────────────────────────────
function ComparisonMarketShareChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData    = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => {
    const totalDengan = d.visits_a + d.visits_b || 1;
    const dNoJukir    = withoutData[i];
    const totalTanpa  = dNoJukir ? (dNoJukir.visits_a + dNoJukir.visits_b || 1) : 1;
    return {
      day: d.day,
      share_a_dengan: Math.round((d.visits_a / totalDengan) * 100),
      share_a_tanpa:  dNoJukir ? Math.round((dNoJukir.visits_a / totalTanpa) * 100) : 0,
    };
  });

  const lastDengan = merged[merged.length - 1]?.share_a_dengan ?? 0;
  const lastTanpa  = merged[merged.length - 1]?.share_a_tanpa  ?? 0;
  const avgDengan  = merged.length ? Math.round(merged.reduce((s, d) => s + d.share_a_dengan, 0) / merged.length) : 0;
  const avgTanpa   = merged.length ? Math.round(merged.reduce((s, d) => s + d.share_a_tanpa,  0) / merged.length) : 0;

  return (
    <ChartCard
      title="📈 Perbandingan Market Share Toko A: Ada Jukir vs Tanpa Jukir"
      subtitle="Proporsi kunjungan ke Toko A dari total agen yang berbelanja — apakah Toko A kembali dominan tanpa jukir?"
      badge={
        <div className="flex gap-2 flex-none">
          <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            Ada: {lastDengan}%
          </span>
          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            Tanpa: {lastTanpa}%
          </span>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#d1d5db" tick={TICK}>
            <Label value="Hari" position="insideBottom" offset={-2} style={{ fill: '#9ca3af', fontSize: 10 }} />
          </XAxis>
          <YAxis stroke="#d1d5db" tick={TICK} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...TOOLTIP}
            formatter={(v) => [`${v}%`]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="4 4">
            <Label value="50%" position="right" style={{ fill: '#94a3b8', fontSize: 9 }} />
          </ReferenceLine>
          <Line dataKey="share_a_dengan" name="Share A — Ada Jukir"   stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="share_a_tanpa"  name="Share A — Tanpa Jukir" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="6 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {[
          { label: 'Share A Akhir Ada Jukir',    value: `${lastDengan}%`,  color: 'text-red-600',  bg: 'bg-red-50 border-red-100'   },
          { label: 'Share A Akhir Tanpa Jukir',  value: `${lastTanpa}%`,   color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Rata-rata Share Ada Jukir',   value: `${avgDengan}%`,   color: 'text-red-500',  bg: 'bg-red-50 border-red-100'   },
          { label: 'Rata-rata Share Tanpa Jukir', value: `${avgTanpa}%`,    color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border ${c.bg} px-3 py-2.5`}>
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">{c.label}</p>
            <p className={`text-base font-bold font-mono ${c.color} mt-0.5`}>{c.value}</p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export function ChartsPanel() {
  const data         = useSimulationStore((s) => s.data);
  const currentFrame = useSimulationStore((s) => s.currentFrame);

  if (!data) return <NoData />;

  const allData  = data.abm_daily;
  const nDays    = allData.length;
  const frame    = Math.min(currentFrame, nDays - 1);

  // Data yang ditampilkan = hanya s.d. frame aktif (real-time update)
  const visibleData = allData.slice(0, frame + 1);

  const criticalDay = findCriticalDay(allData);

  const chartProps: ChartProps = { visibleData, allData, frame, nDays, criticalDay };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-5 space-y-4">

      {/* Playback control di atas */}
      <ChartPlaybackBar frame={frame} nDays={nDays} />

      {/* Critical day alert */}
      {criticalDay && frame >= criticalDay && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-amber-800 text-xs font-semibold">
              Revenue Toko A (ada jukir) mulai kalah dari Toko B sejak Hari ke-{criticalDay}
            </p>
            <p className="text-amber-600 text-[10px] mt-0.5">
              WOM negatif dan akumulasi bad experience telah menggeser preferensi pelanggan ke Toko B.
            </p>
          </div>
        </div>
      )}

      {/* ── PERBANDINGAN ADA vs TANPA JUKIR (highlight utama) ── */}
      <div>
        <h2 className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Analisis Dampak Juru Parkir Liar
        </h2>
        <div className="space-y-4">
          <ComparisonRevenueChart frame={frame} />
          <ComparisonVisitChart frame={frame} />
          <ComparisonMarketShareChart frame={frame} />
          <ComparisonWOMChart frame={frame} />
          <ComparisonRiskChart frame={frame} />
        </div>
      </div>

      {/* Summary stats skenario aktif */}
      <div>
        <h2 className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Ringkasan Skenario Ada Jukir — s.d. Hari {frame + 1}
        </h2>
        <SummaryCards visibleData={visibleData} frame={frame} nDays={nDays} />
      </div>

      {/* Charts detail skenario ada jukir */}
      <div>
        <h2 className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          Detail Dinamika Simulasi (Skenario Ada Jukir)
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <VisitChart {...chartProps} />
          <MarketShareChart {...chartProps} />
          <DailyRevenueChart {...chartProps} />
          <CumulativeRevenueChart {...chartProps} />
          <WOMChart {...chartProps} />
          <RiskAversionChart {...chartProps} />
        </div>
      </div>

      {/* Full-width charts */}
      <AgentScatterChart />
      <ModelParamsSection />
    </div>
  );
}
