"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";
import { useSimulationStore } from "@/lib/simulationStore";
import { DayData } from "@/lib/api";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 11,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  labelStyle: { color: "#1e293b", fontWeight: 600 },
};
const TICK = { fill: "#94a3b8", fontSize: 10 };
const GRID = "#f1f5f9";

// Palette: merah untuk Toko A dengan jukir, biru untuk tanpa jukir, hijau untuk Toko B
const COL = {
  storeA: "#ef4444",
  storeB: "#16a34a",
  noJukir: "#3b82f6",
  wom: "#d97706",
  bad: "#ea580c",
  risk: "#7c3aed",
  aversion: "#0891b2",
  neutral: "#94a3b8",
};

function fmtRp(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
}

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

// ─── Primitives ────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-slate-800 text-sm font-semibold leading-snug">
            {title}
          </h3>
          {subtitle && (
            <p className="text-slate-400 text-[10px] mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
        {badge && <div className="flex-none">{badge}</div>}
      </div>
      {children}
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "red" | "green" | "blue" | "amber" | "purple";
}) {
  const styles: Record<string, string> = {
    default: "bg-slate-50  border-slate-200  text-slate-600",
    red: "bg-red-50    border-red-200    text-red-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    blue: "bg-blue-50   border-blue-200   text-blue-700",
    amber: "bg-amber-50  border-amber-200  text-amber-700",
    purple: "bg-violet-50 border-violet-200 text-violet-700",
  };
  return (
    <span
      className={`inline-block border rounded px-2 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">
      <p className="text-slate-400 text-[9px] uppercase tracking-wider leading-none mb-1">
        {label}
      </p>
      <p className="text-slate-800 text-sm font-semibold font-mono leading-none">
        {value}
      </p>
      {sub && <p className="text-slate-400 text-[9px] mt-1">{sub}</p>}
    </div>
  );
}

function ActiveDayCursor({
  x,
  y,
  height,
}: {
  x?: number;
  y?: number;
  height?: number;
}) {
  if (x == null || y == null || height == null) return null;
  return (
    <line
      x1={x}
      y1={y}
      x2={x}
      y2={y + height}
      stroke="#64748b"
      strokeWidth={1}
      strokeDasharray="3 2"
    />
  );
}

function NoData() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-24 gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        Belum ada data simulasi
      </p>
      <p className="text-xs text-slate-400">
        Jalankan simulasi dari tab Simulasi 3D terlebih dahulu
      </p>
    </div>
  );
}

// ─── Shared prop type ──────────────────────────────────────────────────────────
interface ChartProps {
  visibleData: DayData[];
  allData: DayData[];
  frame: number;
  nDays: number;
  criticalDay: number | null;
}

// ─── Playback bar ──────────────────────────────────────────────────────────────
function ChartPlaybackBar({ frame, nDays }: { frame: number; nDays: number }) {
  const { isPlaying, playbackSpeed, togglePlay, setFrame, setSpeed } =
    useSimulationStore();
  const pct = nDays > 1 ? (frame / (nDays - 1)) * 100 : 0;

  return (
    <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg px-4 py-3">
      <button
        onClick={togglePlay}
        className="flex-none w-8 h-8 flex items-center justify-center bg-slate-900
                   hover:bg-slate-700 text-white rounded-md text-xs font-semibold transition-colors"
      >
        {isPlaying ? "II" : "▶"}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
          <span>Hari 1</span>
          <span className="text-slate-700 font-semibold">
            Hari {frame + 1} / {nDays}
          </span>
          <span>Hari {nDays}</span>
        </div>
        <div
          className="w-full h-1.5 bg-slate-100 rounded-full cursor-pointer relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setFrame(
              Math.round(((e.clientX - rect.left) / rect.width) * (nDays - 1)),
            );
          }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-slate-700 rounded-full"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-slate-700 rounded-full shadow-sm"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 flex-none">
        <span className="text-slate-400 text-[10px] mr-1">Kecepatan</span>
        {[1, 2, 4, 8].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`text-[10px] px-2 py-1 rounded font-mono font-medium transition-colors ${
              playbackSpeed === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Chart 1: Kunjungan Harian ────────────────────────────────────────────────
function VisitChart({
  visibleData,
  allData,
  frame,
  nDays,
  criticalDay,
}: ChartProps) {
  const today = visibleData[visibleData.length - 1];
  return (
    <ChartCard
      title="Kunjungan Harian per Toko"
      subtitle="Jumlah agen yang berbelanja ke Toko A dan B setiap hari"
      badge={
        today && (
          <Badge variant="default">
            A: {today.visits_a} · B: {today.visits_b}
          </Badge>
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={visibleData}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="day"
            stroke="#e2e8f0"
            tick={TICK}
            domain={[1, allData.length]}
          >
            <Label
              value="Hari"
              position="insideBottom"
              offset={-2}
              style={{ fill: "#cbd5e1", fontSize: 10 }}
            />
          </XAxis>
          <YAxis stroke="#e2e8f0" tick={TICK} />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine
              x={criticalDay}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1}
            >
              <Label
                value={`Hari ${criticalDay}`}
                position="top"
                style={{ fill: "#d97706", fontSize: 9 }}
              />
            </ReferenceLine>
          )}
          <Line
            dataKey="visits_a"
            name="Toko A"
            stroke={COL.storeA}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="visits_b"
            name="Toko B"
            stroke={COL.storeB}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="no_buy"
            name="Tidak beli"
            stroke={COL.neutral}
            dot={false}
            strokeWidth={1}
            strokeDasharray="4 3"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 2: Revenue Kumulatif ───────────────────────────────────────────────
function CumulativeRevenueChart({
  visibleData,
  allData,
  frame,
  nDays,
  criticalDay,
}: ChartProps) {
  let cumA = 0,
    cumB = 0;
  const cumData = visibleData.map((d) => {
    cumA += d.revenue_a;
    cumB += d.revenue_b;
    return { day: d.day, cum_a: cumA, cum_b: cumB };
  });
  const last = cumData[cumData.length - 1];
  const gap = last ? Math.abs(last.cum_b - last.cum_a) : 0;
  const bAhead = last && last.cum_b > last.cum_a;

  return (
    <ChartCard
      title="Revenue Kumulatif"
      subtitle="Total pendapatan terakumulasi sepanjang simulasi (Rp)"
      badge={
        last && (
          <Badge variant={bAhead ? "green" : "red"}>
            {bAhead ? `B unggul Rp ${fmtRp(gap)}` : `A unggul Rp ${fmtRp(gap)}`}
          </Badge>
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={cumData}
          margin={{ top: 4, right: 16, bottom: 4, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="day"
            stroke="#e2e8f0"
            tick={TICK}
            domain={[1, allData.length]}
          >
            <Label
              value="Hari"
              position="insideBottom"
              offset={-2}
              style={{ fill: "#cbd5e1", fontSize: 10 }}
            />
          </XAxis>
          <YAxis stroke="#e2e8f0" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [`Rp ${fmtRp(Number(v))}`]}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine
              x={criticalDay}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}
          <Area
            dataKey="cum_a"
            name="Toko A"
            stroke={COL.storeA}
            fill={COL.storeA}
            fillOpacity={0.08}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            dataKey="cum_b"
            name="Toko B"
            stroke={COL.storeB}
            fill={COL.storeB}
            fillOpacity={0.08}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 3: Revenue Harian ──────────────────────────────────────────────────
function DailyRevenueChart({ visibleData, allData, criticalDay }: ChartProps) {
  const today = visibleData[visibleData.length - 1];
  const delta = today ? today.revenue_b - today.revenue_a : 0;

  return (
    <ChartCard
      title="Revenue Harian per Toko"
      subtitle="Pendapatan Toko A vs B per hari (Rp)"
      badge={
        today && (
          <Badge variant={delta > 0 ? "green" : "red"}>
            {delta > 0 ? `B +Rp${fmtRp(delta)}` : `A +Rp${fmtRp(-delta)}`}
          </Badge>
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={visibleData}
          margin={{ top: 4, right: 16, bottom: 4, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK} />
          <YAxis stroke="#e2e8f0" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [`Rp ${fmtRp(Number(v))}`]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine
              x={criticalDay}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}
          <Bar
            dataKey="revenue_a"
            name="Toko A"
            fill={COL.storeA}
            opacity={0.8}
            isAnimationActive={false}
          />
          <Bar
            dataKey="revenue_b"
            name="Toko B"
            fill={COL.storeB}
            opacity={0.8}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 4: WOM & Bad Experience ───────────────────────────────────────────
function WOMChart({ visibleData }: ChartProps) {
  const today = visibleData[visibleData.length - 1];
  return (
    <ChartCard
      title="WOM & Bad Experience Harian"
      subtitle="Pesan word-of-mouth dan pengalaman buruk per hari"
      badge={
        today && (
          <Badge variant="amber">
            WOM {today.wom_messages} · Bad {today.bad_experiences}
          </Badge>
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={visibleData}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK} />
          <YAxis stroke="#e2e8f0" tick={TICK} />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            dataKey="wom_messages"
            name="WOM"
            stroke={COL.wom}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="bad_experiences"
            name="Bad Experience"
            stroke={COL.bad}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 5: Risk & Aversion ─────────────────────────────────────────────────
function RiskAversionChart({ visibleData }: ChartProps) {
  const today = visibleData[visibleData.length - 1];
  const chartData = visibleData.map((d) => ({
    day: d.day,
    avg_risk_a: d.avg_risk_a,
    avg_aversion: d.avg_parking_aversion,
  }));

  return (
    <ChartCard
      title="Rata-rata Perceived Risk & Parking Aversion"
      subtitle="Dinamika persepsi risiko Toko A dan aversion agen (skala 0–1)"
      badge={
        today && (
          <Badge variant="purple">Risk {today.avg_risk_a.toFixed(3)}</Badge>
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK} />
          <YAxis
            stroke="#e2e8f0"
            tick={TICK}
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => [Number(v).toFixed(4), name]}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0.5} stroke="#cbd5e1" strokeDasharray="3 3">
            <Label
              value="0.5"
              position="right"
              style={{ fill: "#94a3b8", fontSize: 9 }}
            />
          </ReferenceLine>
          <Area
            dataKey="avg_risk_a"
            name="Perceived Risk A"
            stroke={COL.risk}
            fill={COL.risk}
            fillOpacity={0.08}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            dataKey="avg_aversion"
            name="Parking Aversion"
            stroke={COL.aversion}
            fill={COL.aversion}
            fillOpacity={0.08}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Chart 6: Market Share ────────────────────────────────────────────────────
function MarketShareChart({ visibleData, allData, criticalDay }: ChartProps) {
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
      title="Market Share Harian (%)"
      subtitle="Proporsi kunjungan Toko A vs B dari total agen yang berbelanja"
      badge={
        today && (
          <Badge variant={today.share_b > today.share_a ? "green" : "red"}>
            A {today.share_a}% · B {today.share_b}%
          </Badge>
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          stackOffset="expand"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK} />
          <YAxis
            stroke="#e2e8f0"
            tick={TICK}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [`${v}%`]}
            labelFormatter={(l) => `Hari ke-${l}`}
            cursor={<ActiveDayCursor />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {criticalDay && (
            <ReferenceLine
              x={criticalDay}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}
          <Area
            dataKey="share_a"
            name="Toko A"
            stackId="1"
            stroke={COL.storeA}
            fill={COL.storeA}
            fillOpacity={0.25}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            dataKey="share_b"
            name="Toko B"
            stackId="1"
            stroke={COL.storeB}
            fill={COL.storeB}
            fillOpacity={0.25}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Scatter: parking_aversion vs perceived_risk_a ───────────────────────────
function AgentScatterChart() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const byChoice = {
    A: data.agent_snapshots
      .filter((a) => a.choice === "A")
      .map((a) => ({ x: a.parking_aversion, y: a.perceived_risk_a, z: 4 })),
    B: data.agent_snapshots
      .filter((a) => a.choice === "B")
      .map((a) => ({ x: a.parking_aversion, y: a.perceived_risk_a, z: 4 })),
    none: data.agent_snapshots
      .filter((a) => a.choice === "none")
      .map((a) => ({ x: a.parking_aversion, y: a.perceived_risk_a, z: 4 })),
  };

  const legendItems = [
    { label: "Pilih A", color: COL.storeA },
    { label: "Pilih B", color: COL.storeB },
    { label: "Tidak beli", color: COL.neutral },
  ];

  return (
    <ChartCard
      title="Distribusi Agen — Hari Terakhir"
      subtitle="Parking Aversion vs Perceived Risk A per agen. Agen dengan aversion tinggi cenderung memilih Toko B."
    >
      {/* Legend custom di luar chart agar tidak tumpang tindih */}
      <div className="flex items-center gap-4 mb-3">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-none"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-500 text-[11px]">{item.label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 10 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number"
            dataKey="x"
            name="Parking Aversion"
            domain={[0, 1]}
            stroke="#e2e8f0"
            tick={TICK}
          >
            <Label
              value="Parking Aversion"
              position="insideBottom"
              offset={-14}
              style={{ fill: "#94a3b8", fontSize: 10 }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name="Perceived Risk A"
            domain={[0, 1]}
            stroke="#e2e8f0"
            tick={TICK}
          >
            <Label
              value="Risk A"
              angle={-90}
              position="insideLeft"
              style={{ fill: "#94a3b8", fontSize: 10 }}
            />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[18, 36]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-slate-200 rounded-md p-2 text-xs shadow-sm">
                  <p className="text-slate-600">
                    Aversion:{" "}
                    <span className="font-mono text-slate-800">
                      {d.x.toFixed(3)}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    Risk A:{" "}
                    <span className="font-mono text-slate-800">
                      {d.y.toFixed(3)}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Scatter
            name="Pilih A"
            data={byChoice.A}
            fill={COL.storeA}
            opacity={0.55}
          />
          <Scatter
            name="Pilih B"
            data={byChoice.B}
            fill={COL.storeB}
            opacity={0.55}
          />
          <Scatter
            name="Tidak beli"
            data={byChoice.none}
            fill={COL.neutral}
            opacity={0.45}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Summary Stats ─────────────────────────────────────────────────────────────
function SummaryCards({ visibleData }: { visibleData: DayData[] }) {
  const totalRevA = visibleData.reduce((s, d) => s + d.revenue_a, 0);
  const totalRevB = visibleData.reduce((s, d) => s + d.revenue_b, 0);
  const totalWOM = visibleData.reduce((s, d) => s + d.wom_messages, 0);
  const totalBad = visibleData.reduce((s, d) => s + d.bad_experiences, 0);
  const n = visibleData.length || 1;
  const avgVisitA = (
    visibleData.reduce((s, d) => s + d.visits_a, 0) / n
  ).toFixed(1);
  const avgVisitB = (
    visibleData.reduce((s, d) => s + d.visits_b, 0) / n
  ).toFixed(1);
  const last = visibleData[visibleData.length - 1];

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        label="Revenue Toko A (kumulatif)"
        value={`Rp ${fmtRp(totalRevA)}`}
      />
      <StatCard
        label="Revenue Toko B (kumulatif)"
        value={`Rp ${fmtRp(totalRevB)}`}
      />
      <StatCard
        label="Selisih (B − A)"
        value={`Rp ${fmtRp(Math.abs(totalRevB - totalRevA))}`}
        sub={totalRevB > totalRevA ? "B lebih tinggi" : "A lebih tinggi"}
      />
      <StatCard label="Rata-rata kunjungan A / hari" value={avgVisitA} />
      <StatCard label="Rata-rata kunjungan B / hari" value={avgVisitB} />
      <StatCard label="Total WOM" value={totalWOM.toLocaleString()} />
      <StatCard
        label="Total Bad Experience"
        value={totalBad.toLocaleString()}
      />
      <StatCard
        label="Perceived Risk A (terakhir)"
        value={last?.avg_risk_a.toFixed(4) ?? "—"}
      />
      <StatCard
        label="Avg Parking Aversion (terakhir)"
        value={last?.avg_parking_aversion.toFixed(4) ?? "—"}
      />
    </div>
  );
}

// ─── Model Parameters ─────────────────────────────────────────────────────────
function ModelParamsSection() {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;
  const mp = data.model_params;
  const cfg = data.sim_config;

  const lastDay = data.abm_daily[data.abm_daily.length - 1];
  const avgAvers = lastDay.avg_parking_aversion;
  const avgRisk = lastDay.avg_risk_a;
  const parkingFeeScore = mp.parking_fee / 200_000;
  const distA = cfg.store_a_x;
  const distB = cfg.store_b_x / 2;

  const scoreA =
    mp.weight_distance * distA +
    mp.weight_parking_aversion * avgAvers +
    mp.weight_parking_fee * parkingFeeScore +
    mp.weight_risk * avgRisk +
    mp.weight_attractiveness * mp.attractiveness_A;

  const scoreB =
    mp.weight_distance * distB + mp.weight_attractiveness * mp.attractiveness_B;

  const maxScore = Math.max(scoreA, scoreB);
  const expA = Math.exp(scoreA - maxScore);
  const expB = Math.exp(scoreB - maxScore);
  const probA = expA / (expA + expB);

  const weights = [
    {
      label: "w_distance",
      value: mp.weight_distance.toFixed(3),
      note: "per meter",
    },
    {
      label: "w_aversion",
      value: mp.weight_parking_aversion.toFixed(1),
      note: "parking_aversion",
    },
    {
      label: "w_fee",
      value: mp.weight_parking_fee.toFixed(1),
      note: "fee / 200k",
    },
    {
      label: "w_risk",
      value: mp.weight_risk.toFixed(1),
      note: "perceived_risk",
    },
    {
      label: "w_attract",
      value: mp.weight_attractiveness.toFixed(1),
      note: "attractiveness",
    },
  ];

  const extras = [
    {
      label: "Biaya Parkir",
      value: `Rp ${(mp.parking_fee / 1000).toFixed(1)}k`,
    },
    { label: "Attract A", value: mp.attractiveness_A.toFixed(2) },
    { label: "Attract B", value: mp.attractiveness_B.toFixed(2) },
    { label: "WOM Prob", value: `${(mp.wom_probability * 100).toFixed(0)}%` },
    { label: "WOM Strength", value: mp.wom_strength.toFixed(3) },
    { label: "Memory Decay", value: mp.memory_decay.toFixed(3) },
    {
      label: "Direct Exp",
      value: mp.direct_experience_impact?.toFixed(2) ?? "—",
    },
    {
      label: "Bad Exp Prob",
      value: `${((mp.bad_experience_probability ?? 0) * 100).toFixed(0)}%`,
    },
    {
      label: "Prob. Belanja",
      value: `${((mp.shopping_proba ?? 0) * 100).toFixed(0)}%`,
    },
    { label: "Jarak A→B", value: `${cfg.store_b_x.toFixed(0)} m` },
  ];

  return (
    <ChartCard
      title="Parameter Model"
      subtitle="Bobot weighted scoring + softmax yang digunakan dalam simulasi ini"
    >
      {/* Weight grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {weights.map((w) => (
          <div
            key={w.label}
            className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
          >
            <p className="text-slate-400 text-[9px] uppercase tracking-wider">
              {w.label}
            </p>
            <p className="text-slate-800 text-sm font-bold font-mono mt-0.5">
              {w.value}
            </p>
            <p className="text-slate-400 text-[8px] mt-0.5">{w.note}</p>
          </div>
        ))}
      </div>

      {/* Score calculation */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-3 space-y-1">
        <p className="text-slate-500 text-[10px] font-semibold mb-1.5">
          Contoh skor (agen rata-rata, hari terakhir)
        </p>
        <p className="text-slate-600 text-[10px] font-mono leading-relaxed">
          score_A = {mp.weight_distance}×dist_A + {mp.weight_parking_aversion}×
          {avgAvers.toFixed(3)} + {mp.weight_parking_fee}×
          {parkingFeeScore.toFixed(4)} + {mp.weight_risk}×{avgRisk.toFixed(3)} +{" "}
          {mp.weight_attractiveness}×{mp.attractiveness_A}
          {" = "}
          <span className="font-bold text-slate-800">{scoreA.toFixed(3)}</span>
        </p>
        <p className="text-slate-600 text-[10px] font-mono leading-relaxed">
          score_B = {mp.weight_distance}×dist_B + {mp.weight_attractiveness}×
          {mp.attractiveness_B}
          {" = "}
          <span className="font-bold text-slate-800">{scoreB.toFixed(3)}</span>
        </p>
        <p className="text-slate-600 text-[10px] font-mono mt-1">
          P(A) ={" "}
          <span className="font-bold text-slate-800">
            {(probA * 100).toFixed(1)}%
          </span>
          {"  "}
          P(B) ={" "}
          <span className="font-bold text-slate-800">
            {((1 - probA) * 100).toFixed(1)}%
          </span>
        </p>
      </div>

      {/* Extra params */}
      <div className="grid grid-cols-4 gap-2">
        {extras.map((e) => (
          <div
            key={e.label}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2"
          >
            <p className="text-slate-400 text-[8px] uppercase tracking-wider">
              {e.label}
            </p>
            <p className="text-slate-700 text-xs font-semibold font-mono mt-0.5">
              {e.value}
            </p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Comparison: Revenue ──────────────────────────────────────────────────────
function ComparisonRevenueChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  let cumWith = 0,
    cumWithout = 0;
  const merged = withData.map((d, i) => {
    cumWith += d.revenue_a;
    cumWithout += withoutData[i]?.revenue_a ?? 0;
    return {
      day: d.day,
      rev_dengan: d.revenue_a,
      rev_tanpa: withoutData[i]?.revenue_a ?? 0,
      cum_dengan: cumWith,
      cum_tanpa: cumWithout,
    };
  });

  const last = merged[merged.length - 1];
  const lostRev = last ? Math.max(0, last.cum_tanpa - last.cum_dengan) : 0;
  const uplift =
    last && last.cum_dengan > 0
      ? (((last.cum_tanpa - last.cum_dengan) / last.cum_dengan) * 100).toFixed(
          1,
        )
      : "—";

  return (
    <ChartCard
      title="Revenue Toko A: Ada Jukir vs Tanpa Jukir"
      subtitle="Perbandingan kumulatif dan harian. Selisih mencerminkan estimasi revenue yang hilang akibat keberadaan jukir."
      badge={
        lostRev > 0 ? (
          <Badge variant="red">
            Hilang Rp {fmtRp(lostRev)} ({uplift}%)
          </Badge>
        ) : (
          <Badge variant="default">Tidak ada selisih signifikan</Badge>
        )
      }
    >
      <p className="text-slate-400 text-[10px] font-medium mb-2">
        Kumulatif (Rp)
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK}>
            <Label
              value="Hari"
              position="insideBottom"
              offset={-2}
              style={{ fill: "#cbd5e1", fontSize: 10 }}
            />
          </XAxis>
          <YAxis stroke="#e2e8f0" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => [`Rp ${fmtRp(Number(v))}`, name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            dataKey="cum_dengan"
            name="Ada Jukir"
            stroke={COL.storeA}
            fill={COL.storeA}
            fillOpacity={0.1}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            dataKey="cum_tanpa"
            name="Tanpa Jukir"
            stroke={COL.noJukir}
            fill={COL.noJukir}
            fillOpacity={0.1}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-slate-400 text-[10px] font-medium mt-4 mb-2">
        Harian (Rp)
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK} />
          <YAxis stroke="#e2e8f0" tick={TICK} tickFormatter={fmtRp} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => [`Rp ${fmtRp(Number(v))}`, name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            dataKey="rev_dengan"
            name="Ada Jukir"
            stroke={COL.storeA}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="rev_tanpa"
            name="Tanpa Jukir"
            stroke={COL.noJukir}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {last && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          <StatCard
            label="Revenue A (ada jukir, kumulatif)"
            value={`Rp ${fmtRp(last.cum_dengan)}`}
          />
          <StatCard
            label="Revenue A (tanpa jukir, kumulatif)"
            value={`Rp ${fmtRp(last.cum_tanpa)}`}
          />
          <StatCard
            label="Estimasi revenue hilang"
            value={lostRev > 0 ? `Rp ${fmtRp(lostRev)}` : "—"}
          />
        </div>
      )}
    </ChartCard>
  );
}

// ─── Comparison: Kunjungan ────────────────────────────────────────────────────
function ComparisonVisitChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => ({
    day: d.day,
    visits_dengan: d.visits_a,
    visits_tanpa: withoutData[i]?.visits_a ?? 0,
  }));

  const n = merged.length || 1;
  const avgDengan = (
    merged.reduce((s, d) => s + d.visits_dengan, 0) / n
  ).toFixed(1);
  const avgTanpa = (merged.reduce((s, d) => s + d.visits_tanpa, 0) / n).toFixed(
    1,
  );

  return (
    <ChartCard
      title="Kunjungan Toko A: Ada Jukir vs Tanpa Jukir"
      subtitle="Jumlah agen yang memilih Toko A per hari pada dua skenario"
      badge={
        <div className="flex gap-2">
          <Badge variant="red">Ada {avgDengan}/hari</Badge>
          <Badge variant="blue">Tanpa {avgTanpa}/hari</Badge>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK}>
            <Label
              value="Hari"
              position="insideBottom"
              offset={-2}
              style={{ fill: "#cbd5e1", fontSize: 10 }}
            />
          </XAxis>
          <YAxis stroke="#e2e8f0" tick={TICK} />
          <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            dataKey="visits_dengan"
            name="Ada Jukir"
            stroke={COL.storeA}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="visits_tanpa"
            name="Tanpa Jukir"
            stroke={COL.noJukir}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Comparison: WOM & Bad Exp ────────────────────────────────────────────────
function ComparisonWOMChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => ({
    day: d.day,
    wom_dengan: d.wom_messages,
    wom_tanpa: withoutData[i]?.wom_messages ?? 0,
    bad_dengan: d.bad_experiences,
    bad_tanpa: withoutData[i]?.bad_experiences ?? 0,
  }));

  const totalWomDengan = merged.reduce((s, d) => s + d.wom_dengan, 0);
  const totalWomTanpa = merged.reduce((s, d) => s + d.wom_tanpa, 0);
  const totalBadDengan = merged.reduce((s, d) => s + d.bad_dengan, 0);
  const totalBadTanpa = merged.reduce((s, d) => s + d.bad_tanpa, 0);

  return (
    <ChartCard
      title="WOM & Bad Experience — Ada Jukir vs Tanpa Jukir"
      subtitle="Dampak sosial yang hilang jika jukir dihapus: penyebaran cerita negatif dan pengalaman buruk"
    >
      <p className="text-slate-400 text-[10px] font-medium mb-2">
        Pesan WOM per hari
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK}>
            <Label
              value="Hari"
              position="insideBottom"
              offset={-2}
              style={{ fill: "#cbd5e1", fontSize: 10 }}
            />
          </XAxis>
          <YAxis stroke="#e2e8f0" tick={TICK} />
          <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            dataKey="wom_dengan"
            name="WOM — Ada Jukir"
            stroke={COL.wom}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="wom_tanpa"
            name="WOM — Tanpa Jukir"
            stroke={COL.noJukir}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-slate-400 text-[10px] font-medium mt-4 mb-2">
        Bad Experience per hari
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK} />
          <YAxis stroke="#e2e8f0" tick={TICK} />
          <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l) => `Hari ke-${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            dataKey="bad_dengan"
            name="Bad Exp — Ada Jukir"
            stroke={COL.bad}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="bad_tanpa"
            name="Bad Exp — Tanpa Jukir"
            stroke={COL.noJukir}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-3 mt-4">
        <StatCard
          label="Total WOM (ada jukir)"
          value={totalWomDengan.toLocaleString()}
        />
        <StatCard
          label="Total WOM (tanpa jukir)"
          value={totalWomTanpa.toLocaleString()}
        />
        <StatCard
          label="Total Bad Exp (ada jukir)"
          value={totalBadDengan.toLocaleString()}
        />
        <StatCard
          label="Total Bad Exp (tanpa jukir)"
          value={totalBadTanpa.toLocaleString()}
        />
      </div>
    </ChartCard>
  );
}

// ─── Comparison: Risk & Aversion ──────────────────────────────────────────────
function ComparisonRiskChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => ({
    day: d.day,
    risk_dengan: d.avg_risk_a,
    risk_tanpa: withoutData[i]?.avg_risk_a ?? 0,
    avers_dengan: d.avg_parking_aversion,
    avers_tanpa: withoutData[i]?.avg_parking_aversion ?? 0,
  }));

  const last = merged[merged.length - 1];

  return (
    <ChartCard
      title="Perceived Risk & Parking Aversion — Ada Jukir vs Tanpa Jukir"
      subtitle="Tanpa jukir, persepsi risiko dan aversion seharusnya mendekati nilai awal dan tidak bertumbuh"
    >
      <p className="text-slate-400 text-[10px] font-medium mb-2">
        Avg Perceived Risk A (0–1)
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <AreaChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK}>
            <Label
              value="Hari"
              position="insideBottom"
              offset={-2}
              style={{ fill: "#cbd5e1", fontSize: 10 }}
            />
          </XAxis>
          <YAxis
            stroke="#e2e8f0"
            tick={TICK}
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => [Number(v).toFixed(4), name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0.5} stroke="#e2e8f0" strokeDasharray="3 3">
            <Label
              value="0.5"
              position="right"
              style={{ fill: "#94a3b8", fontSize: 9 }}
            />
          </ReferenceLine>
          <Area
            dataKey="risk_dengan"
            name="Risk — Ada Jukir"
            stroke={COL.risk}
            fill={COL.risk}
            fillOpacity={0.08}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            dataKey="risk_tanpa"
            name="Risk — Tanpa Jukir"
            stroke={COL.noJukir}
            fill={COL.noJukir}
            fillOpacity={0.08}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-slate-400 text-[10px] font-medium mt-4 mb-2">
        Avg Parking Aversion (0–1)
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <AreaChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK} />
          <YAxis
            stroke="#e2e8f0"
            tick={TICK}
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => [Number(v).toFixed(4), name]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            dataKey="avers_dengan"
            name="Aversion — Ada Jukir"
            stroke={COL.aversion}
            fill={COL.aversion}
            fillOpacity={0.08}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            dataKey="avers_tanpa"
            name="Aversion — Tanpa Jukir"
            stroke={COL.noJukir}
            fill={COL.noJukir}
            fillOpacity={0.08}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {last && (
        <div className="grid grid-cols-4 gap-3 mt-4">
          <StatCard
            label="Risk akhir (ada jukir)"
            value={last.risk_dengan.toFixed(4)}
          />
          <StatCard
            label="Risk akhir (tanpa jukir)"
            value={last.risk_tanpa.toFixed(4)}
          />
          <StatCard
            label="Aversion akhir (ada jukir)"
            value={last.avers_dengan.toFixed(4)}
          />
          <StatCard
            label="Aversion akhir (tanpa jukir)"
            value={last.avers_tanpa.toFixed(4)}
          />
        </div>
      )}
    </ChartCard>
  );
}

// ─── Comparison: Market Share ─────────────────────────────────────────────────
function ComparisonMarketShareChart({ frame }: { frame: number }) {
  const data = useSimulationStore((s) => s.data);
  if (!data) return null;

  const withData = data.abm_daily.slice(0, frame + 1);
  const withoutData = data.abm_daily_no_jukir.slice(0, frame + 1);

  const merged = withData.map((d, i) => {
    const totalDengan = d.visits_a + d.visits_b || 1;
    const dNJ = withoutData[i];
    const totalTanpa = dNJ ? dNJ.visits_a + dNJ.visits_b || 1 : 1;
    return {
      day: d.day,
      share_a_dengan: Math.round((d.visits_a / totalDengan) * 100),
      share_a_tanpa: dNJ ? Math.round((dNJ.visits_a / totalTanpa) * 100) : 0,
    };
  });

  const last = merged[merged.length - 1];
  const n = merged.length || 1;
  const avgDengan = Math.round(
    merged.reduce((s, d) => s + d.share_a_dengan, 0) / n,
  );
  const avgTanpa = Math.round(
    merged.reduce((s, d) => s + d.share_a_tanpa, 0) / n,
  );

  return (
    <ChartCard
      title="Market Share Toko A: Ada Jukir vs Tanpa Jukir"
      subtitle="Proporsi kunjungan ke Toko A. Garis 50% menunjukkan paritas pasar."
      badge={
        last && (
          <div className="flex gap-2">
            <Badge variant="red">Ada {last.share_a_dengan}%</Badge>
            <Badge variant="blue">Tanpa {last.share_a_tanpa}%</Badge>
          </div>
        )
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={merged}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="day" stroke="#e2e8f0" tick={TICK}>
            <Label
              value="Hari"
              position="insideBottom"
              offset={-2}
              style={{ fill: "#cbd5e1", fontSize: 10 }}
            />
          </XAxis>
          <YAxis
            stroke="#e2e8f0"
            tick={TICK}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [`${v}%`]}
            labelFormatter={(l) => `Hari ke-${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="3 3">
            <Label
              value="50%"
              position="right"
              style={{ fill: "#94a3b8", fontSize: 9 }}
            />
          </ReferenceLine>
          <Line
            dataKey="share_a_dengan"
            name="Ada Jukir"
            stroke={COL.storeA}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            dataKey="share_a_tanpa"
            name="Tanpa Jukir"
            stroke={COL.noJukir}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-3 mt-4">
        <StatCard
          label="Share A akhir (ada jukir)"
          value={`${last?.share_a_dengan ?? "—"}%`}
        />
        <StatCard
          label="Share A akhir (tanpa jukir)"
          value={`${last?.share_a_tanpa ?? "—"}%`}
        />
        <StatCard label="Rata-rata share (ada jukir)" value={`${avgDengan}%`} />
        <StatCard
          label="Rata-rata share (tanpa jukir)"
          value={`${avgTanpa}%`}
        />
      </div>
    </ChartCard>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function ChartsPanel() {
  const data = useSimulationStore((s) => s.data);
  const currentFrame = useSimulationStore((s) => s.currentFrame);

  if (!data) return <NoData />;

  const allData = data.abm_daily;
  const nDays = allData.length;
  const frame = Math.min(currentFrame, nDays - 1);
  const visibleData = allData.slice(0, frame + 1);
  const criticalDay = findCriticalDay(allData);
  const chartProps: ChartProps = {
    visibleData,
    allData,
    frame,
    nDays,
    criticalDay,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-6">
      {/* Playback */}
      <ChartPlaybackBar frame={frame} nDays={nDays} />

      {/* Critical day notice */}
      {criticalDay && frame >= criticalDay && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-amber-800 text-xs font-semibold">
            Revenue Toko A mulai di bawah Toko B sejak hari ke-{criticalDay}
          </p>
          <p className="text-amber-600 text-[10px] mt-0.5 leading-snug">
            Akumulasi bad experience dan penyebaran WOM negatif telah menggeser
            preferensi pelanggan ke Toko B.
          </p>
        </div>
      )}

      {/* Analisis Dampak */}
      <div>
        <SectionLabel>Analisis Dampak Juru Parkir Liar</SectionLabel>
        <div className="space-y-4">
          <ComparisonRevenueChart frame={frame} />
          <ComparisonVisitChart frame={frame} />
          <ComparisonMarketShareChart frame={frame} />
          <ComparisonWOMChart frame={frame} />
          <ComparisonRiskChart frame={frame} />
        </div>
      </div>

      {/* Ringkasan */}
      <div>
        <SectionLabel>
          Ringkasan — Skenario Ada Jukir s.d. Hari {frame + 1}
        </SectionLabel>
        <SummaryCards visibleData={visibleData} />
      </div>

      {/* Detail charts */}
      <div>
        <SectionLabel>Detail Dinamika — Skenario Ada Jukir</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <VisitChart {...chartProps} />
          <MarketShareChart {...chartProps} />
          <DailyRevenueChart {...chartProps} />
          <CumulativeRevenueChart {...chartProps} />
          <WOMChart {...chartProps} />
          <RiskAversionChart {...chartProps} />
        </div>
      </div>

      {/* Scatter + params */}
      <div className="space-y-4">
        <SectionLabel>Analisis Lanjutan</SectionLabel>
        <AgentScatterChart />
        <ModelParamsSection />
      </div>
    </div>
  );
}
