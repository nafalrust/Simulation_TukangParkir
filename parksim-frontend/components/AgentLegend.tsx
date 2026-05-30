'use client';

export function AgentLegend() {
  // Catatan: hanya 3 state sesuai model Python (main.py)
  // Agen tidak beli selalu = no_need (tidak ada keperluan belanja hari itu)
  const items = [
    { color: '#dc2626', label: 'Berbelanja ke Toko A', sub: 'berjalan menuju Toko A lalu pulang' },
    { color: '#16a34a', label: 'Berbelanja ke Toko B', sub: 'berjalan menuju Toko B lalu pulang' },
    { color: '#94a3b8', label: 'Tidak keluar (no_need)', sub: 'diam — tidak ada keperluan belanja' },
    { color: '#eab308', label: 'Ring = Bad Experience', sub: 'kena pungutan jukir hari terakhir' },
    { color: '#f59e0b', label: 'Arc kuning = WOM', sub: 'agen menceritakan pengalaman buruk' },
  ];

  return (
    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-xl p-3 pointer-events-none shadow-md border border-green-100">
      <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-2 font-semibold">Legenda</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-2 mb-1.5">
          <div
            className="w-3 h-3 rounded-full flex-none mt-0.5 shadow-sm"
            style={{ backgroundColor: item.color }}
          />
          <div>
            <div className="text-gray-800 text-[9px] font-semibold leading-tight">{item.label}</div>
            <div className="text-gray-400 text-[8px] leading-tight">{item.sub}</div>
          </div>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
        <p className="text-gray-400 text-[8px]">Ukuran agen ∝ tingkat aversion</p>
        <p className="text-gray-400 text-[8px]">Arc kuning = WOM sedang tersebar</p>
      </div>
    </div>
  );
}
