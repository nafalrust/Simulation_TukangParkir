'use client';

import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useSimulationStore } from '@/lib/simulationStore';
import { DayData } from '@/lib/api';

const CHART_STYLE = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: 8,
    fontSize: 11,
  },
  labelStyle: { color: '#e5e7eb' },
  itemStyle: { color: '#9ca3af' },
};

function fmtRp(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `${(v / 1000).toFixed(0)}rb`;
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-gray-300 text-xs font-semibold mb-2">{title}</h3>;
}

export function RevenueChart() {
  const { data, currentFrame } = useSimulationStore();
  if (!data) return null;

  const nDays = data.abm_daily.length;
  const frame = Math.min(currentFrame, nDays - 1);
  const visibleData: DayData[] = data.abm_daily.slice(0, frame + 1);

  // Cumulative revenue
  let cumA = 0, cumB = 0;
  const cumulativeData = visibleData.map((d) => {
    cumA += d.revenue_a;
    cumB += d.revenue_b;
    return { day: d.day, cum_a: cumA, cum_b: cumB };
  });

  const tickStyle = { fill: '#6b7280', fontSize: 10 };

  return (
    <div className="bg-gray-900/80 border-t border-gray-800 px-4 py-3 grid grid-cols-3 gap-4">

      {/* Chart 1: Kunjungan Harian */}
      <div>
        <SectionTitle title="📊 Kunjungan Harian" />
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={visibleData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" stroke="#374151" tick={tickStyle} />
            <YAxis stroke="#374151" tick={tickStyle} />
            <Tooltip {...CHART_STYLE}
              formatter={(v) => [v]}
              labelFormatter={(l) => `Hari ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line dataKey="visits_a" name="Toko A" stroke="#f87171" dot={false} strokeWidth={2} />
            <Line dataKey="visits_b" name="Toko B" stroke="#4ade80" dot={false} strokeWidth={2} />
            <Line dataKey="avg_memory_a" name="Avg Mem A" stroke="#a78bfa"
              dot={false} strokeWidth={1.5} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Revenue Kumulatif */}
      <div>
        <SectionTitle title="💰 Revenue Kumulatif" />
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" stroke="#374151" tick={tickStyle} />
            <YAxis stroke="#374151" tick={tickStyle} tickFormatter={fmtRp} />
            <Tooltip {...CHART_STYLE}
              formatter={(v) => [`Rp ${fmtRp(Number(v))}`]}
              labelFormatter={(l) => `Hari ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area dataKey="cum_a" name="Rev A" stroke="#f87171" fill="#f87171" fillOpacity={0.15} strokeWidth={2} />
            <Area dataKey="cum_b" name="Rev B" stroke="#4ade80" fill="#4ade80" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3: WOM & Bad Exp */}
      <div>
        <SectionTitle title="📣 WOM & Bad Experience" />
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={visibleData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" stroke="#374151" tick={tickStyle} />
            <YAxis stroke="#374151" tick={tickStyle} />
            <Tooltip {...CHART_STYLE} labelFormatter={(l) => `Hari ${l}`} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="wom_messages" name="WOM" fill="#fbbf24" opacity={0.8} />
            <Bar dataKey="bad_experiences" name="Bad Exp" fill="#f97316" opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DCMPanel() {
  const { data } = useSimulationStore();
  if (!data) return null;
  const dcm = data.dcm_results;

  return (
    <div className="bg-gray-900/80 border-t border-gray-800 px-4 py-3">
      <h3 className="text-gray-300 text-xs font-semibold mb-2">🔬 Hasil DCM (Multinomial Logit)</h3>
      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'β Jarak', value: dcm.beta_jarak.toFixed(4), hint: 'p=' + dcm.p_value_jarak.toFixed(3), color: 'text-red-400' },
          { label: 'β Jukir', value: dcm.beta_parkir.toFixed(4), hint: 'p=' + dcm.p_value_parkir.toFixed(3), color: 'text-red-400' },
          { label: "McFadden R²", value: dcm.pseudo_r2.toFixed(3), hint: '>0.2 = fit baik', color: 'text-green-400' },
          { label: 'Log-Likelihood', value: dcm.log_likelihood.toFixed(1), hint: '', color: 'text-blue-400' },
          { label: 'N Responden', value: dcm.n_respondents.toString(), hint: '', color: 'text-yellow-400' },
        ].map((item) => (
          <div key={item.label} className="bg-gray-800 rounded-lg px-3 py-2 min-w-[110px]">
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">{item.label}</div>
            <div className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</div>
            {item.hint && <div className="text-gray-600 text-[9px]">{item.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
