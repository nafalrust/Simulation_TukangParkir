'use client';

export function AgentLegend() {
  const items = [
    { color: '#ef4444', label: 'Pilih Toko A (ada jukir)' },
    { color: '#22c55e', label: 'Pilih Toko B (aman)' },
    { color: '#475569', label: 'Tidak jadi beli' },
    { color: '#fbbf24', label: 'Bad experience (ring kuning)' },
  ];

  return (
    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur rounded-lg p-2.5 pointer-events-none">
      <p className="text-gray-400 text-[9px] uppercase tracking-wider mb-1.5">Legenda Agen</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 mb-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-none"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-300 text-[9px]">{item.label}</span>
        </div>
      ))}
      <div className="mt-1.5 pt-1.5 border-t border-gray-700">
        <p className="text-gray-500 text-[8px]">Ukuran ∝ |memori negatif|</p>
        <p className="text-gray-500 text-[8px]">✨ percikan = WOM tersebar</p>
      </div>
    </div>
  );
}
