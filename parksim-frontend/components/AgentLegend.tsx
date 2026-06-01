"use client";

const ITEMS = [
  { color: "#dc2626", label: "Toko A", sub: "memilih Toko A hari ini" },
  { color: "#16a34a", label: "Toko B", sub: "memilih Toko B hari ini" },
  {
    color: "#94a3b8",
    label: "Tidak belanja",
    sub: "kebutuhan belanja tidak terpenuhi",
  },
  {
    color: "#eab308",
    label: "Bad experience",
    sub: "ring kuning: terkena pungutan hari ini",
  },
];

export function AgentLegend() {
  return (
    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg p-3 pointer-events-none shadow-sm border border-slate-200">
      <p className="text-slate-400 text-[9px] font-semibold uppercase tracking-widest mb-2.5">
        Legenda
      </p>
      <div className="space-y-2">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full flex-none"
              style={{ backgroundColor: item.color }}
            />
            <div>
              <div className="text-slate-700 text-[9px] font-medium leading-tight">
                {item.label}
              </div>
              <div className="text-slate-400 text-[8px] leading-tight">
                {item.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 pt-2 border-t border-slate-100">
        <p className="text-slate-400 text-[8px]">
          Arc kuning = WOM sedang menyebar
        </p>
      </div>
    </div>
  );
}
