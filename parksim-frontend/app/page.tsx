import Link from "next/link";

const FEATURES = [
  {
    label: "ABM",
    title: "Agent-Based Model",
    desc: "Simulasi dinamika 200+ agen pelanggan selama N hari menggunakan Mesa. Tiap agen memiliki atribut unik: jarak ke toko, sensitivitas parkir, dan memori pengalaman.",
  },
  {
    label: "Softmax",
    title: "Weighted Scoring",
    desc: "Pilihan toko dihitung dari skor tertimbang (jarak, biaya, risiko, daya tarik) yang dikonversi ke probabilitas via fungsi softmax.",
  },
  {
    label: "WOM",
    title: "Word-of-Mouth Dynamics",
    desc: "Agen yang mengalami pengalaman buruk menyebarkan cerita ke tetangganya, meningkatkan persepsi risiko kolektif terhadap Toko A secara organik.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <span className="font-semibold text-sm tracking-wide text-white">
          ParkSim
        </span>
        <Link
          href="/simulation"
          className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          Buka Simulator
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-28 pb-20">
        <div className="inline-block mb-6 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-slate-400 tracking-wide">
          Simulasi Berbasis Agen · Perilaku Konsumen
        </div>

        <h1 className="text-5xl font-bold tracking-tight leading-tight text-white mb-6">
          Dampak Juru Parkir Liar
          <br />
          <span className="text-slate-400">terhadap Revenue Minimarket</span>
        </h1>

        <p className="text-slate-400 text-base leading-relaxed max-w-xl mb-10">
          Model komputasional yang mensimulasikan bagaimana keberadaan juru
          parkir liar mempengaruhi keputusan belanja pelanggan dan seberapa
          besar revenue yang hilang seiring waktu akibat efek memori dan
          penyebaran informasi.
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/simulation"
            className="px-6 py-2.5 bg-white text-[#0f1117] rounded-lg text-sm font-semibold
                       hover:bg-slate-100 transition-colors"
          >
            Jalankan Simulasi
          </Link>
          <span className="text-slate-600 text-sm">
            Sesuaikan parameter, lihat hasilnya secara real-time
          </span>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-white/5 max-w-7xl mx-auto" />

      {/* Feature cards */}
      <section className="max-w-4xl mx-auto px-8 py-16 grid grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.label} className="space-y-3">
            <div className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              {f.label}
            </div>
            <div className="text-sm font-semibold text-white">{f.title}</div>
            <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Divider */}
      <div className="border-t border-white/5 max-w-7xl mx-auto" />

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-8">
          Alur Model
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              step: "01",
              title: "Atur Parameter",
              desc: "Biaya parkir, jumlah agen, radius pasar, bobot skor, dan lainnya.",
            },
            {
              step: "02",
              title: "Jalankan ABM",
              desc: "Setiap agen membuat keputusan independen berdasarkan utilitas yang dihitung.",
            },
            {
              step: "03",
              title: "Lihat Dinamika 3D",
              desc: "Pantau pergerakan agen dan persebaran WOM di scene interaktif.",
            },
            {
              step: "04",
              title: "Analisis Dampak",
              desc: "Bandingkan revenue, kunjungan, dan market share antar skenario.",
            },
          ].map((item) => (
            <div key={item.step} className="space-y-2">
              <div className="text-[10px] font-mono text-slate-600">
                {item.step}
              </div>
              <div className="text-sm font-medium text-slate-200">
                {item.title}
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-slate-600 text-xs">ParkSim</span>
        <span className="text-slate-700 text-xs">
          Model: Mesa ABM · Weighted Scoring + Softmax · FastAPI
        </span>
      </footer>
    </main>
  );
}
