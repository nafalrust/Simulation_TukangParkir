'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ParameterPanel } from '@/components/ParameterPanel';
import { HUD } from '@/components/HUD';
import { AgentLegend } from '@/components/AgentLegend';
import { ChartsPanel } from '@/components/ChartsPanel';
import { useSimulationStore } from '@/lib/simulationStore';

const SimulationCanvas = dynamic(
  () => import('@/components/SimulationCanvas').then((m) => ({ default: m.SimulationCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <span className="text-slate-400 text-sm">Memuat scene 3D…</span>
      </div>
    ),
  },
);

type Tab = '3d' | 'charts';

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function JukirToggle() {
  const { data, showNoJukir, toggleJukirMode } = useSimulationStore();
  if (!data) return null;

  return (
    <button
      onClick={toggleJukirMode}
      className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
        showNoJukir
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${showNoJukir ? 'bg-emerald-500' : 'bg-red-500'}`}
      />
      Toko A: {showNoJukir ? 'Tanpa Jukir' : 'Ada Jukir'}
    </button>
  );
}

export default function SimulationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('3d');

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden">

      {/* Header */}
      <header className="flex-none flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 z-10">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-slate-400 hover:text-slate-700 text-xs transition-colors"
          >
            Beranda
          </a>
          <span className="text-slate-200 select-none">/</span>
          <span className="text-slate-800 font-semibold text-sm">ParkSim</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5">
            <PillButton active={activeTab === '3d'} onClick={() => setActiveTab('3d')}>
              Simulasi 3D
            </PillButton>
            <PillButton active={activeTab === 'charts'} onClick={() => setActiveTab('charts')}>
              Analisis
            </PillButton>
          </div>

          {activeTab === '3d' && <JukirToggle />}
        </div>

        <div className="flex items-center gap-3" />
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <ParameterPanel />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 3D tab */}
          <div className={`flex-1 relative overflow-hidden ${activeTab === '3d' ? 'flex flex-col' : 'hidden'}`}>
            <SimulationCanvas />
            <HUD />
            <AgentLegend />
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
