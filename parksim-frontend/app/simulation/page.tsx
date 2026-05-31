'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ParameterPanel } from '@/components/ParameterPanel';
import { HUD } from '@/components/HUD';
import { AgentLegend } from '@/components/AgentLegend';
import { ChartsPanel } from '@/components/ChartsPanel';

const SimulationCanvas = dynamic(
  () => import('@/components/SimulationCanvas').then((m) => ({ default: m.SimulationCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#f0fdf4]">
        <div className="text-green-700 text-sm animate-pulse font-medium">Memuat scene 3D…</div>
      </div>
    ),
  },
);

type Tab = '3d' | 'charts';

export default function SimulationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('3d');

  return (
    <div className="flex flex-col h-screen bg-[#f0fdf4] text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-green-200 bg-white/90 backdrop-blur z-10 flex-none shadow-sm">
        <div className="flex items-center gap-3">
          <a href="/" className="text-green-700 hover:text-green-900 text-sm font-medium transition-colors">
            ← Beranda
          </a>
          <span className="text-gray-300">|</span>
          <span className="text-green-800 font-bold text-sm tracking-wide">ParkSim</span>
          <span className="text-gray-400 text-xs">Simulasi Tukang Parkir Liar × Revenue Minimarket</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('3d')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === '3d'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🌍 3D Scene
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'charts'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Charts & Analisis
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === '3d' && (
            <span className="text-gray-400 text-[10px] bg-gray-100 rounded px-2 py-1 font-mono hidden xl:block">
              WASD/↑↓←→ gerak · Q/E naik/turun · scroll zoom · drag orbit
            </span>
          )}
          <span className="text-gray-400 text-xs">TPS DTETI UGM 2025</span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — selalu tampil */}
        <ParameterPanel />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 3D tab */}
          <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === '3d' ? 'flex' : 'hidden'}`}>
            <div className="flex-1 relative">
              <SimulationCanvas />
              <HUD />
              <AgentLegend />
            </div>
          </div>

          {/* Charts tab */}
          <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'charts' ? 'flex' : 'hidden'}`}>
            <ChartsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
