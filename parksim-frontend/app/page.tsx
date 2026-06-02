"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    num: "01",
    title: "Atur Parameter",
    desc: "Tentukan jumlah agen, radius pasar, daya tarik toko, dan bobot penalti parkir sesuai skenario yang ingin diuji.",
  },
  {
    num: "02",
    title: "Jalankan Simulasi",
    desc: "Ratusan agen membuat keputusan secara independen setiap hari berdasarkan utilitas yang dihitung dari pengalaman dan informasi sosial.",
  },
  {
    num: "03",
    title: "Amati di Ruang 3D",
    desc: "Lihat pergerakan agen secara langsung di visualisasi tiga dimensi. Setiap titik adalah satu pelanggan dengan keputusannya sendiri.",
  },
  {
    num: "04",
    title: "Baca Dampaknya",
    desc: "Bandingkan revenue, kunjungan harian, dan market share antara skenario ada-jukir dan tanpa-jukir dalam satu tampilan.",
  },
];

const STATS = [
  { value: "200+", label: "Agen per simulasi" },
  { value: "180", label: "Hari maksimum" },
  { value: "2", label: "Skenario paralel" },
  { value: "Real-time", label: "Update visualisasi" },
];

function AnimatedNumber({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{current}</span>;
}

export default function Home() {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#0f1117] text-white selection:bg-white/20">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/15 bg-[#0f1117]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-wide text-white">
            ParkSim
          </span>
          <Link
            href="/simulation"
            className="text-xs font-medium px-4 py-2 rounded-md border border-white/25 text-slate-300
                       hover:text-white hover:border-white/50 transition-all duration-200"
          >
            Buka Simulator
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-24 pb-20">
        <div className="max-w-3xl">
          <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mb-8">
            Simulasi Berbasis Agen &nbsp;·&nbsp; Perilaku Konsumen
          </p>

          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-[1.1] text-white mb-6">
            Apa yang terjadi ketika
            <br />
            <span className="text-slate-400">
              pelanggan merasa tidak nyaman parkir?
            </span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed max-w-2xl mb-3">
            ParkSim memodelkan bagaimana keberadaan juru parkir liar di depan
            sebuah minimarket perlahan menggeser pelanggan ke kompetitor
            terdekat. Satu keputusan kecil yang, bila diulang ratusan kali
            setiap hari, berdampak besar pada revenue.
          </p>

          <p className="text-slate-600 text-sm mb-10">
            Sesuaikan parameter, lihat hasilnya secara langsung.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/simulation"
              className="px-6 py-3 bg-white text-[#0f1117] rounded-lg text-sm font-semibold
                         hover:bg-slate-100 active:scale-95 transition-all duration-150"
            >
              Jalankan Simulasi
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="border-y border-white/15">
        <div className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="text-2xl font-bold text-white tabular-nums">
                {s.value === "Real-time" ? (
                  s.value
                ) : s.value.endsWith("+") ? (
                  <>
                    <AnimatedNumber target={parseInt(s.value)} />+
                  </>
                ) : (
                  <AnimatedNumber target={parseInt(s.value)} />
                )}
              </div>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bagian Konteks */}
      <section className="max-w-6xl mx-auto px-8 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mb-5">
              Latar Belakang
            </p>
            <h2 className="text-2xl font-bold text-white leading-snug mb-5">
              Masalah yang terlihat kecil, dampaknya tidak
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Juru parkir liar bukan sekadar gangguan di trotoar. Bagi pemilik
              minimarket, mereka adalah variabel tersembunyi yang mempengaruhi
              persepsi kenyamanan pelanggan; ujungnya, pelanggan memilih ke mana
              mereka akan belanja hari ini dan esok.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mb-5">
              Pendekatan
            </p>
            <h2 className="text-2xl font-bold text-white leading-snug mb-5">
              Model yang tumbuh dari keputusan individu
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Alih-alih memodelkan agregat, ParkSim mensimulasikan setiap
              pelanggan secara individual. Mereka punya memori, dipengaruhi
              cerita tetangga, dan menghitung ulang pilihan toko setiap kali
              hendak berbelanja. Hasilnya adalah pola kolektif yang muncul
              secara organik.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <div className="border-t border-white/15">
        <section className="max-w-6xl mx-auto px-8 py-20">
          <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mb-14">
            Alur Simulasi
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {STEPS.map((item, i) => (
              <div
                key={item.num}
                className={`relative p-6 border-l border-white/20 cursor-default transition-all duration-300
                  ${hoveredStep === item.num ? "bg-white/[0.04] border-white/40" : ""}`}
                onMouseEnter={() => setHoveredStep(item.num)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {i === 0 && (
                  <div className="absolute left-0 top-0 h-full w-px bg-white/[0.06]" />
                )}
                <div className="text-[10px] font-mono text-slate-600 mb-4">
                  {item.num}
                </div>
                <div
                  className={`text-sm font-semibold mb-3 transition-colors duration-200
                  ${hoveredStep === item.num ? "text-white" : "text-slate-200"}`}
                >
                  {item.title}
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Mekanisme */}
      <div className="border-t border-white/15">
        <section className="max-w-6xl mx-auto px-8 py-20">
          <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mb-14">
            Mekanisme Model
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                label: "ABM",
                title: "Agent-Based Modeling",
                desc: "Dibangun dengan Mesa. Setiap agen menyimpan state sendiri, mulai dari seberapa takut kena palak, seberapa buruk pengalaman terakhir, hingga siapa yang mereka percaya ceritanya.",
              },
              {
                label: "Tallying",
                title: "Weighted Scoring",
                desc: "Pilihan toko dihitung dari bobot jarak, daya tarik, aversi parkir, dan risiko yang dipersepsikan. Tidak ada formula ajaib, hanya penjumlahan yang jujur.",
              },
              {
                label: "WOM",
                title: "Word of Mouth",
                desc: "Pengalaman buruk menyebar. Setiap hari, agen berbagi cerita dengan tetangga terdekat mereka dan secara perlahan menggeser persepsi orang lain tanpa perlu iklan.",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="p-6 rounded-lg border border-white/20 hover:border-white/40
                           hover:bg-white/[0.03] transition-all duration-300 group"
              >
                <div className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-3">
                  {m.label}
                </div>
                <div className="text-sm font-semibold text-white mb-3 group-hover:text-white">
                  {m.title}
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="border-t border-white/15">
        <section className="max-w-6xl mx-auto px-8 py-24 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Coba sendiri, atur parameternya
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-md mx-auto">
            Ganti jumlah agen, ubah tarif parkir, sesuaikan daya tarik toko
            pesaing, lalu lihat apa yang berubah.
          </p>
          <Link
            href="/simulation"
            className="inline-block px-8 py-3 bg-white text-[#0f1117] rounded-lg text-sm font-semibold
                       hover:bg-slate-100 active:scale-95 transition-all duration-150"
          >
            Buka Simulator
          </Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/15">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <span className="text-slate-600 text-xs">ParkSim</span>
          <span className="text-slate-700 text-xs font-mono">
            Mesa ABM · Tallying Score · FastAPI
          </span>
        </div>
      </footer>
    </main>
  );
}
