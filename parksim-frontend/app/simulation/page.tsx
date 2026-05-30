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
    <div className="flex-1 flex items-center justify-center bg-[#0a0a14]">
      <div className="text-blue-400 text-sm animate-pulse">Memuat scene 3D…</div>
    </div>
  )},
);

export default function SimulationPage() {
  return (
    <div className="flex flex-col h-screen bg-[#0a0a14] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/80 backdrop-blur z-10 flex-none">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">← Beranda</a>
          <span className="text-gray-600">|</span>
          <span className="text-white font-bold text-sm tracking-wide">ParkSim</span>
          <span className="text-gray-500 text-xs">Simulasi Tukang Parkir Liar × Revenue Minimarket</span>
        </div>
        <div className="text-gray-600 text-xs">TPS DTETI UGM 2025</div>
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
