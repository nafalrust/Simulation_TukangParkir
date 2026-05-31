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

// Slider sections for better organization
const SLIDER_SECTIONS: { title: string; sliders: SliderConfig[] }[] = [
  {
    title: 'Populasi & Durasi',
    sliders: [
      {
        key: 'n_agents', label: 'Jumlah Agen', min: 50, max: 500, step: 10,
        hint: 'Jumlah pelanggan dalam simulasi',
        format: (v) => `${v} orang`,
      },
      {
        key: 'n_days', label: 'Durasi Simulasi', min: 10, max: 180, step: 5,
        hint: 'Lama simulasi berlangsung (hari)',
        format: (v) => `${v} hari`,
      },
      {
        key: 'market_radius', label: 'Radius Pasar (m)', min: 100, max: 2000, step: 50,
        hint: 'Radius area tempat tinggal agen tersebar',
        format: (v) => `${v} m`,
      },
      {
        key: 'distance_to_B', label: 'Jarak A→B (m)', min: 50, max: 1500, step: 50,
        hint: 'Jarak antara Toko A (ada jukir) dan Toko B',
        format: (v) => `${v} m`,
      },
    ],
  },
  {
    title: 'Parameter Toko',
    sliders: [
      {
        key: 'parking_fee', label: 'Biaya Parkir (Rp)', min: 0, max: 20000, step: 500,
        hint: 'Biaya yang dipungut jukir di Toko A (Rp)',
        format: (v) => `Rp ${(v / 1000).toFixed(1)}rb`,
      },
      {
        key: 'attractiveness_A', label: 'Daya Tarik Toko A', min: 0, max: 1, step: 0.05,
        hint: 'Faktor daya tarik Toko A (produk, kebersihan, dll)',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'attractiveness_B', label: 'Daya Tarik Toko B', min: 0, max: 1, step: 0.05,
        hint: 'Faktor daya tarik Toko B (tanpa jukir)',
        format: (v) => v.toFixed(2),
      },
    ],
  },
  {
    title: 'Perilaku Agen',
    sliders: [
      {
        key: 'parking_aversion', label: 'Avg Aversion Awal', min: 0, max: 1, step: 0.05,
        hint: 'Rata-rata sensitivitas awal agen terhadap jukir (±0.2 acak)',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'initial_risk_a', label: 'Risiko Awal Toko A', min: 0, max: 1, step: 0.05,
        hint: 'Persepsi risiko awal terhadap Toko A sebelum simulasi',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'shopping_prob', label: 'Prob. Belanja/Hari', min: 0.05, max: 1, step: 0.05,
        hint: 'Probabilitas agen ingin belanja pada suatu hari',
        format: (v) => `${(v * 100).toFixed(0)}%`,
      },
    ],
  },
  {
    title: 'Memori & Pengalaman',
    sliders: [
      {
        key: 'memory_strength', label: 'Kekuatan Memori', min: 0, max: 0.5, step: 0.01,
        hint: 'Seberapa besar bad experience menaikkan parking_aversion',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'memory_decay', label: 'Memory Decay', min: 0, max: 0.1, step: 0.005,
        hint: 'Laju memudarnya ingatan negatif per hari',
        format: (v) => v.toFixed(3),
      },
      {
        key: 'direct_experience_impact', label: 'Dampak Pengalaman Langsung', min: 0, max: 1, step: 0.05,
        hint: 'Seberapa besar bad experience menaikkan perceived_risk_a',
        format: (v) => v.toFixed(2),
      },
    ],
  },
  {
    title: 'Word of Mouth (Sosial)',
    sliders: [
      {
        key: 'wom_probability', label: 'Prob. WOM', min: 0, max: 1, step: 0.05,
        hint: 'Peluang agen yang bad experience menyebarkan cerita',
        format: (v) => `${(v * 100).toFixed(0)}%`,
      },
      {
        key: 'wom_strength', label: 'Kekuatan WOM', min: 0, max: 0.5, step: 0.01,
        hint: 'Besaran kenaikan aversion/risk pendengar WOM',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'num_contacts', label: 'Jumlah Kontak WOM', min: 1, max: 10, step: 1,
        hint: 'Berapa agen yang diceritai satu storyteller per hari',
        format: (v) => `${v} orang`,
      },
    ],
  },
  {
    title: 'Bobot Skor Keputusan',
    sliders: [
      {
        key: 'weight_distance', label: 'Bobot Jarak', min: -0.02, max: 0, step: 0.001,
        hint: 'Pengaruh jarak terhadap skor (negatif = jarak jauh = skor turun)',
        format: (v) => v.toFixed(3),
      },
      {
        key: 'weight_parking_aversion', label: 'Bobot Aversion', min: -5, max: 0, step: 0.1,
        hint: 'Pengaruh parking_aversion agen terhadap skor Toko A',
        format: (v) => v.toFixed(1),
      },
      {
        key: 'weight_parking_fee', label: 'Bobot Biaya Parkir', min: -5, max: 0, step: 0.1,
        hint: 'Pengaruh biaya parkir terhadap skor Toko A',
        format: (v) => v.toFixed(1),
      },
      {
        key: 'weight_risk', label: 'Bobot Risiko', min: -5, max: 0, step: 0.1,
        hint: 'Pengaruh perceived_risk_a terhadap skor Toko A',
        format: (v) => v.toFixed(1),
      },
      {
        key: 'weight_attractiveness', label: 'Bobot Daya Tarik', min: 0, max: 5, step: 0.1,
        hint: 'Pengaruh attractiveness toko terhadap skor (positif)',
        format: (v) => v.toFixed(1),
      },
    ],
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
            className="text-gray-400 hover:text-gray-600 text-xs leading-none"
            type="button"
          >
            ⓘ
          </button>
        </div>
        <span className="text-blue-600 text-xs font-mono font-semibold">{displayValue}</span>
      </div>
      {showHint && (
        <div className="text-gray-500 text-[10px] bg-gray-50 rounded p-1.5 border border-gray-200">
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
      <div className="flex justify-between text-gray-400 text-[9px]">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
}

function SectionGroup({ title, sliders }: { title: string; sliders: SliderConfig[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        type="button"
      >
        <span className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider">{title}</span>
        <span className="text-gray-400 text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="p-3 space-y-3 bg-white">
          {sliders.map((cfg) => (
            <ParamSlider key={cfg.key} config={cfg} />
          ))}
        </div>
      )}
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

      {/* Playback speed */}
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

      {/* Animation speed */}
      <div>
        <div className="flex justify-between text-gray-500 text-[10px] mb-1">
          <span>Kecepatan Gerak Agen</span>
          <span className="font-mono text-green-600">{animationSpeed.toFixed(2)}×</span>
        </div>
        <input type="range" min={0.05} max={2.0} step={0.05} value={animationSpeed}
          onChange={(e) => setAnimationSpeed(Number(e.target.value))}
          className="w-full h-1.5 accent-green-500 cursor-pointer" />
        <div className="flex justify-between text-gray-400 text-[9px]">
          <span>0.05 (sangat lambat)</span><span>2.0 (cepat)</span>
        </div>
        <p className="text-gray-400 text-[8px] mt-0.5">Kurangi untuk analisa yang lebih jelas</p>
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

      <div className="space-y-2">
        {SLIDER_SECTIONS.map((section) => (
          <SectionGroup key={section.title} title={section.title} sliders={section.sliders} />
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
          Model: ABM (Mesa) · Weighted Scoring + Softmax<br />
          Referensi: Holm et al. (2016) JASSS
        </p>
      </div>
    </aside>
  );
}
