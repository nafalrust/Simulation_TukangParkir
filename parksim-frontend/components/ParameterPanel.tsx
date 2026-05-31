'use client';

import { useSimulationStore } from '@/lib/simulationStore';
import { SimulateRequest } from '@/lib/api';
import { useState } from 'react';

interface SliderConfig {
  key: keyof SimulateRequest;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
  format?: (v: number) => string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'n_agents', label: 'Jumlah Agen', min: 50, max: 500, step: 10,
    hint: 'Jumlah pelanggan dalam simulasi (50–500)',
    format: (v) => `${v} orang`,
  },
  {
    key: 'n_days', label: 'Durasi (hari)', min: 10, max: 180, step: 5,
    hint: 'Lama simulasi berlangsung',
    format: (v) => `${v} hari`,
  },
  {
    key: 'distance_between_stores', label: 'Jarak A–B (m)', min: 50, max: 1500, step: 50,
    hint: 'Jarak antar dua minimarket dalam meter',
    format: (v) => `${v} m`,
  },
  {
    key: 'parking_intensity', label: 'Intensitas Jukir', min: 0, max: 1, step: 0.05,
    hint: '0 = pasif/tidak mengganggu, 1 = sangat agresif',
    format: (v) => v.toFixed(2),
  },
  {
    key: 'shopping_prob', label: 'Prob. Belanja/Hari', min: 0.05, max: 1, step: 0.05,
    hint: 'Probabilitas pelanggan ke minimarket tiap hari',
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
  {
    key: 'avg_spending', label: 'Rata-rata Belanja', min: 5000, max: 100000, step: 5000,
    hint: 'Nominal belanja per kunjungan (Rp)',
    format: (v) => `Rp ${(v / 1000).toFixed(0)}rb`,
  },
  {
    key: 'wom_impact', label: 'WOM Impact', min: 0, max: 0.5, step: 0.01,
    hint: 'Seberapa kuat cerita negatif teman mempengaruhi persepsi',
    format: (v) => v.toFixed(2),
  },
  {
    key: 'share_probability', label: 'Prob. Berbagi Cerita', min: 0, max: 1, step: 0.05,
    hint: 'Peluang pelanggan cerita pengalaman buruk ke teman',
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
  {
    key: 'memory_decay', label: 'Memory Decay', min: 0, max: 0.1, step: 0.005,
    hint: 'Laju memudarnya ingatan negatif per hari',
    format: (v) => v.toFixed(3),
  },
  {
    key: 'direct_experience_impact', label: 'Dampak Pengalaman Langsung', min: 0, max: 1, step: 0.05,
    hint: 'Seberapa besar bad experience meningkatkan persepsi risiko',
    format: (v) => v.toFixed(2),
  },
];

function ParamSlider({ config }: { config: SliderConfig }) {
  const { params, setParam } = useSimulationStore();
  const [showHint, setShowHint] = useState(false);
  const value = params[config.key] as number;
  const displayValue = config.format ? config.format(value) : String(value);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <label className="text-gray-700 text-xs font-medium">{config.label}</label>
          <button
            onMouseEnter={() => setShowHint(true)}
            onMouseLeave={() => setShowHint(false)}
            className="text-gray-500 hover:text-gray-500 text-xs leading-none"
            type="button"
          >
            ⓘ
          </button>
        </div>
        <span className="text-blue-600 text-xs font-mono font-semibold">{displayValue}</span>
      </div>
      {showHint && (
        <div className="text-gray-500 text-[10px] bg-gray-100 rounded p-1.5 border border-gray-700">
          {config.hint}
        </div>
      )}
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => setParam(config.key, Number(e.target.value))}
        className="w-full h-1.5 accent-blue-500 cursor-pointer"
      />
      <div className="flex justify-between text-gray-500 text-[9px]">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
}

function PlaybackControls() {
  const {
    currentFrame, isPlaying, playbackSpeed, animationSpeed,
    data, setFrame, togglePlay, setSpeed, setAnimationSpeed, reset,
  } = useSimulationStore();
  if (!data) return null;

  const nDays = data.abm_daily.length;

  return (
    <div className="space-y-3 pt-2 border-t border-gray-200">
      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Kontrol Playback</p>

      <div className="flex gap-1.5 items-center">
        <button onClick={() => setFrame(0)} title="Ke awal"
          className="flex-none px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
          ⏮
        </button>
        <button onClick={togglePlay}
          className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors">
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => setFrame(nDays - 1)} title="Ke akhir"
          className="flex-none px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
          ⏭
        </button>
        <button onClick={reset} title="Reset"
          className="flex-none px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded text-sm transition-colors">
          ↺
        </button>
      </div>

      {/* Day scrubber */}
      <div>
        <div className="flex justify-between text-gray-500 text-[10px] mb-1">
          <span>Hari</span>
          <span className="font-mono text-blue-600">{currentFrame + 1} / {nDays}</span>
        </div>
        <input type="range" min={0} max={nDays - 1} value={currentFrame}
          onChange={(e) => setFrame(Number(e.target.value))}
          className="w-full h-1.5 accent-blue-500 cursor-pointer" />
      </div>

      {/* Playback speed (kecepatan ganti hari) */}
      <div>
        <div className="flex justify-between text-gray-500 text-[10px] mb-1">
          <span>Kecepatan Hari</span>
          <span className="font-mono text-blue-600">{playbackSpeed}×</span>
        </div>
        <input type="range" min={1} max={8} step={1} value={playbackSpeed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full h-1.5 accent-blue-500 cursor-pointer" />
        <div className="flex justify-between text-gray-400 text-[9px]">
          <span>1× (lambat)</span><span>8× (cepat)</span>
        </div>
      </div>

      {/* Animation speed (kecepatan gerak fisik agen) */}
      <div>
        <div className="flex justify-between text-gray-500 text-[10px] mb-1">
          <span>Kecepatan Gerak Agen</span>
          <span className="font-mono text-blue-600">{animationSpeed.toFixed(2)}×</span>
        </div>
        <input type="range" min={0.05} max={2.0} step={0.05} value={animationSpeed}
          onChange={(e) => setAnimationSpeed(Number(e.target.value))}
          className="w-full h-1.5 accent-green-500 cursor-pointer" />
        <div className="flex justify-between text-gray-400 text-[9px]">
          <span>0.05 (sangat lambat)</span><span>2.0 (cepat)</span>
        </div>
        <p className="text-gray-400 text-[8px] mt-0.5">Atur untuk analisa yang lebih jelas</p>
      </div>
    </div>
  );
}

export function ParameterPanel() {
  const { runSimulation, isLoading, error, resetParams } = useSimulationStore();

  return (
    <aside className="w-72 bg-white/95 backdrop-blur flex flex-col gap-3 p-4 overflow-y-auto border-r border-gray-200 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-gray-800 font-bold text-xs uppercase tracking-wider">
          ⚙️ Parameter Simulasi
        </h2>
        <button
          onClick={resetParams}
          className="text-gray-500 hover:text-gray-700 text-[10px] transition-colors"
          title="Reset ke default"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {SLIDERS.map((cfg) => (
          <ParamSlider key={cfg.key} config={cfg} />
        ))}
      </div>

      <div className="pt-2 space-y-2">
        <button
          onClick={runSimulation}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed
                     text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
        >
          {isLoading ? '⏳ Simulating...' : '▶ Jalankan Simulasi'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded p-2 text-red-600 text-xs">
            ⚠️ {error}
          </div>
        )}
      </div>

      <PlaybackControls />

      <div className="mt-auto pt-3 border-t border-gray-200">
        <p className="text-gray-500 text-[9px] leading-relaxed">
          ParkSim — TPS DTETI UGM 2025<br />
          Model: DCM (MNL) + ABM (Mesa)<br />
          Referensi: Holm et al. (2016) JASSS
        </p>
      </div>
    </aside>
  );
}
