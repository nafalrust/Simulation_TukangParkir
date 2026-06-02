'use client';

import { useSimulationStore } from '@/lib/simulationStore';
import { DayData } from '@/lib/api';

function fmtRp(v: number) {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(2)}jt`;
  return `Rp ${(v / 1000).toFixed(0)}rb`;
}

function Chip({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`px-3 py-1.5 rounded border min-w-[80px] ${
      highlight
        ? 'bg-white border-slate-300 shadow-sm'
        : 'bg-white/80 border-slate-200'
    }`}>
      <div className="text-slate-400 text-[9px] uppercase tracking-wider">{label}</div>
      <div className="text-slate-800 text-sm font-semibold font-mono leading-tight">{value}</div>
    </div>
  );
}

export function HUD() {
  const { data, currentFrame, showNoJukir } = useSimulationStore();
  if (!data) return null;

  const activeDaily = showNoJukir ? data.abm_daily_no_jukir : data.abm_daily;
  const nDays = activeDaily.length;
  const frame = Math.min(currentFrame, nDays - 1);
  const d: DayData = activeDaily[frame];

  return (
    <div className="absolute bottom-4 left-4 right-4 flex gap-2 pointer-events-none flex-wrap items-end">

      {/* Scenario badge */}
      <div className={`px-3 py-1.5 rounded border ${
        showNoJukir
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="text-[9px] uppercase tracking-wider text-slate-400">Skenario</div>
        <div className={`text-sm font-semibold ${showNoJukir ? 'text-emerald-700' : 'text-red-700'}`}>
          {showNoJukir ? 'Tanpa Jukir' : 'Ada Jukir'}
        </div>
      </div>

      <Chip label="Hari" value={`${frame + 1} / ${nDays}`} highlight />
      <Chip label="Revenue A" value={fmtRp(d.revenue_a)} />
      <Chip label="Revenue B" value={fmtRp(d.revenue_b)} />
      <Chip label="Kunjungan A" value={d.visits_a} />
      <Chip label="Kunjungan B" value={d.visits_b} />
      <Chip label="Avg Aversion" value={d.avg_parking_aversion.toFixed(3)} />
    </div>
  );
}
