'use client';

import { useSimulationStore } from '@/lib/simulationStore';
import { DayData } from '@/lib/api';

function fmtRp(v: number) {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(2)}jt`;
  return `Rp ${(v / 1000).toFixed(0)}rb`;
}

const CARDS: Record<string, { border: string; text: string; bg: string }> = {
  blue:   { border: 'border-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
  red:    { border: 'border-red-400',    text: 'text-red-700',    bg: 'bg-red-50'    },
  green:  { border: 'border-green-500',  text: 'text-green-700',  bg: 'bg-green-50'  },
  yellow: { border: 'border-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  orange: { border: 'border-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
  purple: { border: 'border-purple-400', text: 'text-purple-700', bg: 'bg-purple-50' },
};

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  const s = CARDS[accent] ?? CARDS.blue;
  return (
    <div className={`${s.bg} border-l-2 ${s.border} rounded-lg px-3 py-1.5 min-w-[88px] shadow-sm`}>
      <div className="text-gray-500 text-[9px] uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold font-mono ${s.text}`}>{value}</div>
    </div>
  );
}

export function HUD() {
  const { data, currentFrame } = useSimulationStore();
  if (!data) return null;

  const nDays = data.abm_daily.length;
  const frame = Math.min(currentFrame, nDays - 1);
  const d: DayData = data.abm_daily[frame];

  return (
    <div className="absolute bottom-4 left-4 right-4 flex gap-2 pointer-events-none flex-wrap">
      <StatCard label="Hari" value={`${frame + 1}/${nDays}`} accent="blue" />
      <StatCard label="Rev Toko A" value={fmtRp(d.revenue_a)} accent="red" />
      <StatCard label="Rev Toko B" value={fmtRp(d.revenue_b)} accent="green" />
      <StatCard label="Kunjungan A" value={d.visits_a} accent="red" />
      <StatCard label="Kunjungan B" value={d.visits_b} accent="green" />
      <StatCard label="WOM" value={d.wom_messages} accent="yellow" />
      <StatCard label="Bad Exp" value={d.bad_experiences} accent="orange" />
      <StatCard label="Avg Risk A" value={d.avg_risk_a.toFixed(3)} accent="purple" />
    </div>
  );
}
