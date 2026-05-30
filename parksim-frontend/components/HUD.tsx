'use client';

import { useSimulationStore } from '@/lib/simulationStore';
import { DayData } from '@/lib/api';

function fmtRp(v: number) {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(2)}jt`;
  return `Rp ${(v / 1000).toFixed(0)}rb`;
}

const ACCENT: Record<string, string> = {
  blue:   'border-blue-500 text-blue-400',
  red:    'border-red-500 text-red-400',
  green:  'border-green-500 text-green-400',
  yellow: 'border-yellow-400 text-yellow-300',
  orange: 'border-orange-400 text-orange-300',
  purple: 'border-purple-400 text-purple-300',
};

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className={`bg-black/70 backdrop-blur border-l-2 ${ACCENT[accent]} rounded-lg px-3 py-2 min-w-[90px]`}>
      <div className="text-gray-400 text-[9px] uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold font-mono ${ACCENT[accent].split(' ')[1]}`}>{value}</div>
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
      <StatCard label="Avg Mem A" value={d.avg_memory_a.toFixed(3)} accent="purple" />
    </div>
  );
}
