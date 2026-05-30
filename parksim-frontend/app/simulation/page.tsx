'use client';

import dynamic from 'next/dynamic';
import { ParameterPanel } from '@/components/ParameterPanel';
import { HUD } from '@/components/HUD';
import { AgentLegend } from '@/components/AgentLegend';
import { RevenueChart, DCMPanel } from '@/components/RevenueChart';

// Three.js canvas must be loaded client-side only
const SimulationCanvas = dynamic(
  () => import('@/components/SimulationCanvas').then((m) => ({ default: m.SimulationCanvas })),
  { ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#f0fdf4]">
      <div className="text-green-700 text-sm animate-pulse font-medium">Memuat scene 3D…</div>
    </div>
  )},
);

export default function SimulationPage() {
  return (
    <div className="flex flex-col h-screen bg-[#f0fdf4] text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-green-200 bg-white/90 backdrop-blur z-10 flex-none shadow-sm">
        <div className="flex items-center gap-3">
          <a href="/" className="text-green-700 hover:text-green-900 text-sm transition-colors font-medium">← Beranda</a>
          <span className="text-gray-300">|</span>
          <span className="text-green-800 font-bold text-sm tracking-wide">ParkSim</span>
          <span className="text-gray-500 text-xs">Simulasi Tukang Parkir Liar × Revenue Minimarket</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-[10px] bg-gray-100 rounded px-2 py-1 font-mono">
            WASD/↑↓←→ gerak · Q/E naik/turun · scroll zoom · drag orbit
          </span>
          <span className="text-gray-400 text-xs">TPS DTETI UGM 2025</span>
        </div>
      </header>

      {/* Main area: sidebar + canvas */}
      <div className="flex flex-1 overflow-hidden">
        <ParameterPanel />

        {/* Canvas + overlays */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <SimulationCanvas />
            <HUD />
            <AgentLegend />
          </div>

          {/* Charts row */}
          <RevenueChart />
          <DCMPanel />
        </div>
      </div>
    </div>
  );
}
