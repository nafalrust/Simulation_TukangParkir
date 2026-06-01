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

const SLIDER_SECTIONS: { title: string; sliders: SliderConfig[] }[] = [
  {
    title: 'Populasi & Durasi',
    sliders: [
      {
        key: 'n_agents', label: 'Jumlah Agen', min: 50, max: 1000, step: 10,
        hint: 'Jumlah pelanggan dalam simulasi',
        format: (v) => `${v} orang`,
      },
      {
        key: 'n_days', label: 'Durasi Simulasi', min: 10, max: 360, step: 5,
        hint: 'Lama simulasi berlangsung',
        format: (v) => `${v} hari`,
      },
      {
        key: 'market_radius', label: 'Radius Pasar', min: 100, max: 4000, step: 50,
        hint: 'Radius area tempat tinggal agen tersebar',
        format: (v) => `${v} m`,
      },
      {
        key: 'distance_to_B', label: 'Jarak A ke B', min: 50, max: 3000, step: 50,
        hint: 'Jarak antara Toko A dan Toko B',
        format: (v) => `${v} m`,
      },
    ],
  },
  {
    title: 'Parameter Toko',
    sliders: [
      {
        key: 'parking_fee', label: 'Biaya Parkir', min: 0, max: 40000, step: 500,
        hint: 'Biaya yang dipungut jukir di Toko A',
        format: (v) => `Rp ${(v / 1000).toFixed(1)}k`,
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
      {
        key: 'min_purchase_amount', label: 'Min. Pembelian', min: 1000, max: 100000, step: 1000,
        hint: 'Jumlah pembelian minimum per transaksi',
        format: (v) => `Rp ${(v / 1000).toFixed(0)}k`,
      },
      {
        key: 'max_purchase_amount', label: 'Maks. Pembelian', min: 50000, max: 2000000, step: 50000,
        hint: 'Jumlah pembelian maksimum per transaksi',
        format: (v) => `Rp ${(v / 1000).toFixed(0)}k`,
      },
    ],
  },
  {
    title: 'Perilaku Agen',
    sliders: [
      {
        key: 'parking_aversion', label: 'Aversion Awal (Rata-rata)', min: 0, max: 1, step: 0.05,
        hint: 'Rata-rata sensitivitas awal agen terhadap jukir (distribusi ±0.2)',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'initial_risk_a', label: 'Risiko Awal Toko A', min: 0, max: 1, step: 0.05,
        hint: 'Persepsi risiko awal agen terhadap Toko A sebelum simulasi',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'shopping_proba', label: 'Prob. Belanja per Hari', min: 0.05, max: 1, step: 0.05,
        hint: 'Probabilitas agen ingin belanja pada suatu hari',
        format: (v) => `${(v * 100).toFixed(0)}%`,
      },
    ],
  },
  {
    title: 'Memori & Pengalaman',
    sliders: [
      {
        key: 'memory_decay', label: 'Memory Decay', min: 0, max: 0.2, step: 0.005,
        hint: 'Laju memudarnya perceived_risk_a per hari (mean reversion)',
        format: (v) => v.toFixed(3),
      },
      {
        key: 'direct_experience_impact', label: 'Dampak Pengalaman Langsung', min: 0, max: 1, step: 0.05,
        hint: 'Seberapa besar bad experience menaikkan perceived_risk_a',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'bad_experience_probability', label: 'Prob. Bad Experience', min: 0, max: 1, step: 0.05,
        hint: 'Peluang agen mengalami bad experience saat ke Toko A (ada jukir)',
        format: (v) => `${(v * 100).toFixed(0)}%`,
      },
    ],
  },
  {
    title: 'Word of Mouth',
    sliders: [
      {
        key: 'wom_probability', label: 'Prob. Cerita', min: 0, max: 1, step: 0.05,
        hint: 'Peluang agen yang bad experience menyebarkan cerita',
        format: (v) => `${(v * 100).toFixed(0)}%`,
      },
      {
        key: 'wom_strength', label: 'Kekuatan WOM', min: 0, max: 1.0, step: 0.01,
        hint: 'Besaran kenaikan aversion/risk pendengar WOM',
        format: (v) => v.toFixed(2),
      },
      {
        key: 'num_contacts', label: 'Jumlah Kontak', min: 1, max: 20, step: 1,
        hint: 'Berapa agen yang diceritai satu storyteller per hari',
        format: (v) => `${v} orang`,
      },
    ],
  },
  {
    title: 'Bobot Skor',
    sliders: [
      {
        key: 'weight_distance', label: 'Jarak', min: 0, max: 10, step: 0.1,
        hint: 'Penalty jarak ternormalisasi; makin besar, toko yang jauh makin tidak menarik',
        format: (v) => v.toFixed(1),
      },
      {
        key: 'weight_parking_aversion', label: 'Aversion', min: 0, max: 10, step: 0.1,
        hint: 'Penalty parking_aversion terhadap Toko A saat ada jukir',
        format: (v) => v.toFixed(1),
      },
      {
        key: 'weight_parking_fee', label: 'Biaya Parkir', min: 0, max: 10, step: 0.1,
        hint: 'Penalty biaya parkir relatif terhadap nominal belanja agen',
        format: (v) => v.toFixed(1),
      },
      {
        key: 'weight_risk', label: 'Risiko', min: 0, max: 10, step: 0.1,
        hint: 'Penalty perceived_risk_a terhadap Toko A saat ada jukir',
        format: (v) => v.toFixed(1),
      },
      {
        key: 'weight_attractiveness', label: 'Daya Tarik', min: 0, max: 10, step: 0.1,
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 text-xs">{config.label}</label>
          <button
            onMouseEnter={() => setShowHint(true)}
            onMouseLeave={() => setShowHint(false)}
            className="w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 hover:border-slate-400
                       text-[9px] leading-none flex items-center justify-center transition-colors"
            type="button"
          >
            ?
          </button>
        </div>
        <span className="text-slate-900 text-xs font-mono font-medium">{displayValue}</span>
      </div>
      {showHint && (
        <div className="text-slate-500 text-[10px] bg-slate-50 rounded px-2 py-1.5 border border-slate-200 leading-snug">
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
        className="w-full h-1 accent-slate-700 cursor-pointer"
      />
      <div className="flex justify-between text-slate-400 text-[9px]">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
}

function SectionGroup({ title, sliders }: { title: string; sliders: SliderConfig[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="border border-slate-200 rounded-md overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
        type="button"
      >
        <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">{title}</span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          viewBox="0 0 12 12" fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!collapsed && (
        <div className="p-3 space-y-4 bg-white">
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
    currentFrame, isPlaying, playbackSpeed,
    data, setFrame, togglePlay, setSpeed, reset,
  } = useSimulationStore();
  if (!data) return null;

  const nDays = data.abm_daily.length;
  const progress = nDays > 1 ? (currentFrame / (nDays - 1)) * 100 : 0;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200">
      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">Playback</p>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-slate-400 text-[10px] mb-1.5">
          <span>Hari</span>
          <span className="font-mono text-slate-600">{currentFrame + 1} / {nDays}</span>
        </div>
        <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-slate-700 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range" min={0} max={nDays - 1} value={currentFrame}
          onChange={(e) => setFrame(Number(e.target.value))}
          className="w-full opacity-0 h-1.5 -mt-1.5 cursor-pointer relative z-10"
        />
      </div>

      {/* Controls */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setFrame(0)}
          className="flex-none w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors text-xs"
        >
          {/* skip to start */}
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M3 3h1.5v10H3V3zm9.5 1.5L6 8l6.5 3.5V4.5z" />
          </svg>
        </button>
        <button
          onClick={togglePlay}
          className="flex-1 h-8 bg-slate-900 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors"
        >
          {isPlaying ? 'Jeda' : 'Putar'}
        </button>
        <button
          onClick={() => setFrame(nDays - 1)}
          className="flex-none w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M12.5 3H11v10h1.5V3zM3.5 4.5L10 8 3.5 11.5V4.5z" />
          </svg>
        </button>
        <button
          onClick={reset}
          className="flex-none w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
            <path d="M3 8a5 5 0 1 1 1.5 3.5" strokeLinecap="round" />
            <path d="M3 11.5V8H6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Speed */}
      <div>
        <div className="flex justify-between text-slate-400 text-[10px] mb-1.5">
          <span>Kecepatan</span>
          <span className="font-mono text-slate-600">{playbackSpeed}×</span>
        </div>
        <input
          type="range" min={1} max={8} step={1} value={playbackSpeed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full h-1 accent-slate-700 cursor-pointer"
        />
        <div className="flex justify-between text-slate-400 text-[9px] mt-0.5">
          <span>1× lambat</span><span>8× cepat</span>
        </div>
      </div>
    </div>
  );
}

export function ParameterPanel() {
  const { runSimulation, isLoading, error, resetParams } = useSimulationStore();

  return (
    <aside className="w-72 bg-white flex flex-col gap-3 p-4 overflow-y-auto border-r border-slate-200 h-full">

      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-slate-700 font-semibold text-xs uppercase tracking-widest">
          Parameter
        </h2>
        <button
          onClick={resetParams}
          className="text-slate-400 hover:text-slate-600 text-[10px] transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Sliders */}
      <div className="space-y-2">
        {SLIDER_SECTIONS.map((section) => (
          <SectionGroup key={section.title} title={section.title} sliders={section.sliders} />
        ))}
      </div>

      {/* Run button */}
      <div className="pt-1 space-y-2">
        <button
          onClick={runSimulation}
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400
                     disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md
                     transition-colors text-sm"
        >
          {isLoading ? 'Menjalankan simulasi…' : 'Jalankan Simulasi'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-600 text-xs leading-snug">
            {error}
          </div>
        )}
      </div>

      <PlaybackControls />

      {/* Footer note */}
      <div className="mt-auto pt-3 border-t border-slate-200">
        <p className="text-slate-400 text-[9px] leading-relaxed">
          Model: Mesa ABM · Weighted Scoring + Softmax<br />
          Backend: FastAPI · Python 3.11
        </p>
      </div>
    </aside>
  );
}
