import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a14] text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            ParkSim
          </h1>
          <p className="text-gray-400 text-lg">
            Simulasi Pengaruh Tukang Parkir Liar terhadap Revenue Minimarket
          </p>
        </div>

        <p className="text-gray-500 text-sm leading-relaxed">
          Model berbasis agen (ABM) yang dikalibrasi dengan Discrete Choice Model (DCM)
          untuk mensimulasikan dinamika perilaku pelanggan minimarket di Indonesia
          akibat keberadaan tukang parkir liar.
        </p>

        <div className="grid grid-cols-3 gap-4 text-xs">
          {[
            { icon: '🧮', title: 'DCM (MNL)', desc: 'Estimasi preferensi konsumen dari data survei' },
            { icon: '🤖', title: 'ABM (Mesa)', desc: 'Simulasi dinamika 200+ agen selama 60 hari' },
            { icon: '🎮', title: '3D Visualization', desc: 'Scene interaktif dengan Three.js' },
          ].map((item) => (
            <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-white font-semibold text-xs mb-1">{item.title}</div>
              <div className="text-gray-500 text-[10px]">{item.desc}</div>
            </div>
          ))}
        </div>

        <Link
          href="/simulation"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold
                     py-3 px-10 rounded-xl text-sm transition-colors"
        >
          Mulai Simulasi →
        </Link>

        <p className="text-gray-700 text-xs">
          Teknik Pemodelan dan Simulasi · DTETI UGM 2025 ·{' '}
          <span className="text-gray-600">Holm et al. (2016) JASSS</span>
        </p>
      </div>
    </main>
  );
}
