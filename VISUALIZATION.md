# VISUALIZATION.md — Spesifikasi Animasi Three.js

> Spesifikasi teknis lengkap untuk `parksim-frontend/components/SimulationCanvas.tsx`.
> Tujuan: visualisasi terlihat seperti mini-game top-down kota, BUKAN grafik akademis biasa.

---

## Filosofi Visual

Visualisasi harus bisa dipahami cukup dengan **melihatnya** — tanpa membaca angka.
- **Warna = keputusan**: merah ke Toko A, hijau ke Toko B, abu tidak beli
- **Ukuran agen = intensitas**: semakin buruk memori, semakin gelap/besar aura negatif
- **Partikel = cerita**: WOM terlihat sebagai percikan cahaya yang menyebar
- **Revenue terlihat langsung**: angka floating di atas toko, tumbuh / turun real-time
- **Nuansa game**: dark city map, neon lights, smooth easing, kamera bebas (OrbitControls)

---

## Komponen Three.js Utama

### 1. `SimulationCanvas.tsx` — Scene Root

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Fog } from '@react-three/drei';

export function SimulationCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 180, 250], fov: 45 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0a14' }}
    >
      <Fog attach="fog" args={['#0a0a14', 400, 900]} />
      <Stars radius={300} depth={60} count={2000} factor={3} fade />

      <SceneLighting />
      <Ground />
      <StoreA />
      <StoreB />
      <AgentLayer />
      <WOMParticleSystem />
      <DayClock />

      <OrbitControls
        minPolarAngle={Math.PI / 6}   // 30° — tidak bisa lihat dari bawah
        maxPolarAngle={Math.PI / 2.2} // ~81° — tidak bisa lihat sejajar tanah
        enablePan={true}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
```

---

### 2. `SceneLighting` — Pencahayaan Atmosferik

```tsx
function SceneLighting() {
  return (
    <>
      {/* Ambient — cahaya dasar kota malam */}
      <ambientLight intensity={0.35} color="#1a1a3e" />

      {/* Directional — "bulan" dari sudut */}
      <directionalLight
        position={[100, 200, 50]}
        intensity={0.6}
        color="#e0e8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Neon Toko A — merah */}
      <pointLight position={[store_a_x, 30, store_a_y]}
        color="#ff4466" intensity={3} distance={250} decay={2} />

      {/* Neon Toko B — hijau */}
      <pointLight position={[store_b_x, 30, store_b_y]}
        color="#44ffaa" intensity={3} distance={250} decay={2} />
    </>
  );
}
```

---

### 3. `Ground` — Area Kota / Peta

```tsx
function Ground() {
  return (
    <group>
      {/* Aspal / jalan — gelap */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial
          color="#111118"
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Grid helper subtle — nuansa peta kota */}
      <gridHelper args={[1200, 60, '#1a1a2e', '#16162a']} />

      {/* Garis putus-putus antar toko (road marking) */}
      <RoadLine from={storeAPos} to={storeBPos} />

      {/* Radius lingkaran pasar (tipis, subtle) */}
      <CircleOutline radius={market_radius} color="#1e2d40" />
    </group>
  );
}
```

---

### 4. `StoreBuilding` — Bangunan Minimarket

Setiap toko punya bangunan 3D dengan papan neon yang menyala.

```tsx
function StoreBuilding({ position, label, color, neonColor, revenue }) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Bangunan utama */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[32, 20, 28]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Atap datar dengan border neon */}
      <mesh position={[0, 11, 0]}>
        <boxGeometry args={[34, 2, 30]} />
        <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={0.6} />
      </mesh>

      {/* Papan nama — "TOKO A" / "TOKO B" */}
      <Billboard position={[0, 24, 0]}>
        <Text
          fontSize={8}
          color={neonColor}
          outlineColor="#000"
          outlineWidth={0.5}
        >
          {`TOKO ${label}`}
        </Text>
      </Billboard>

      {/* Revenue display — floating, update tiap hari */}
      <Billboard position={[0, 38, 0]}>
        <RevenueDisplay value={revenue} color={neonColor} />
      </Billboard>

      {/* Glow effect di sekitar toko */}
      <mesh position={[0, 1, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color={neonColor} transparent opacity={0.04} />
      </mesh>
    </group>
  );
}
```

#### `RevenueDisplay` — Angka Revenue Animasi

```tsx
function RevenueDisplay({ value, color }) {
  const formatted = value >= 1_000_000
    ? `Rp ${(value / 1_000_000).toFixed(2)}jt`
    : `Rp ${(value / 1000).toFixed(0)}rb`;

  return (
    <Text fontSize={5} color={color} anchorX="center" anchorY="middle">
      {formatted}
    </Text>
  );
}
```

---

### 5. `JukirFigure` — Animasi Tukang Parkir

Di depan Toko A, ada figur jukir yang bergerak mondar-mandir.

```tsx
function JukirFigure({ storePosition }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    // Pacing animation — bolak-balik di depan toko
    const t = clock.getElapsedTime();
    ref.current.position.x = storePosition[0] + Math.sin(t * 0.8) * 20;
    ref.current.rotation.y = Math.sin(t * 0.8) > 0 ? 0 : Math.PI;
  });

  return (
    <group ref={ref} position={[storePosition[0], 0, storePosition[2] + 20]}>
      {/* Body sederhana — capsule */}
      <mesh position={[0, 8, 0]} castShadow>
        <capsuleGeometry args={[3, 8, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" /> {/* warna rompi jukir */}
      </mesh>
      {/* Kepala */}
      <mesh position={[0, 18, 0]}>
        <sphereGeometry args={[3.5, 8, 8]} />
        <meshStandardMaterial color="#d97706" />
      </mesh>
    </group>
  );
}
```

---

### 6. `AgentLayer` — Semua Agen Pelanggan

Ini adalah komponen paling penting. Setiap agen dirender sebagai sphere berwarna.

```tsx
function AgentLayer({ agents, currentDayData, frame, nDays }) {
  return (
    <group>
      {agents.map(agent => (
        <AgentMesh
          key={agent.id}
          agent={agent}
          dayData={currentDayData}
          frame={frame}
          nDays={nDays}
        />
      ))}
    </group>
  );
}

function AgentMesh({ agent, dayData, frame, nDays }) {
  const meshRef = useRef();
  const ringRef = useRef();

  // Hitung warna agen berdasarkan frame
  const color = useMemo(() => {
    if (frame === nDays - 1) {
      // Hari terakhir: pakai data asli
      return agent.choice === 'A' ? '#ef4444'
           : agent.choice === 'B' ? '#22c55e'
           : '#475569';
    }
    // Hari lain: probabilistic hash deterministik
    const total = dayData.visits_a + dayData.visits_b + dayData.no_buy;
    const pA = dayData.visits_a / total;
    const pB = dayData.visits_b / total;
    const r = fract(Math.sin(agent.id * 127.1 + frame * 311.7) * 43758.5453);
    return r < pA ? '#ef4444' : r < pA + pB ? '#22c55e' : '#475569';
  }, [agent, dayData, frame, nDays]);

  // Ukuran agen ∝ |memory_a| (semakin buruk memori, semakin besar)
  const size = 3 + Math.abs(agent.memory_a || 0) * 5;

  // Animasi ring kuning untuk bad experience
  useFrame(({ clock }) => {
    if (ringRef.current && agent.had_bad_experience && frame === nDays - 1) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.15;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  const pos: [number, number, number] = [agent.x, size / 2, agent.y];

  return (
    <group position={pos}>
      {/* Sphere agen */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Ring kuning untuk bad experience (hanya hari terakhir) */}
      {agent.had_bad_experience && frame === nDays - 1 && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size + 1, size + 3, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Glow di bawah agen (shadow soft) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -size / 2 + 0.1, 0]}>
        <circleGeometry args={[size * 1.2, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function fract(x: number): number { return x - Math.floor(x); }
```

---

### 7. `WOMParticleSystem` — Partikel Word-of-Mouth

Setiap kali WOM terjadi, muncul percikan cahaya kuning yang menyebar dari agen ke agen.

```tsx
function WOMParticleSystem({ womCount, agentPositions }) {
  // Spawn N partikel saat womCount meningkat
  // Partikel bergerak dari satu agen ke agen tetangganya
  // Menggunakan useRef + useFrame untuk performa
  
  // Implementasi menggunakan Points (instanced) untuk performa:
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (womCount > 0) {
      // Spawn burst partikel dari posisi agen random
      const newParticles = Array.from({ length: womCount * 3 }, (_, i) => ({
        id: Date.now() + i,
        origin: agentPositions[Math.floor(Math.random() * agentPositions.length)],
        velocity: [
          (Math.random() - 0.5) * 40,
          Math.random() * 30 + 10,
          (Math.random() - 0.5) * 40,
        ],
        life: 1.0,
      }));
      setParticles(prev => [...prev, ...newParticles].slice(-200)); // max 200 partikel
    }
  }, [womCount]);

  return (
    <group>
      {particles.map(p => (
        <WOMParticle key={p.id} {...p} onDead={() => {
          setParticles(prev => prev.filter(x => x.id !== p.id));
        }} />
      ))}
    </group>
  );
}
```

---

### 8. `DayClock` — Indikator Hari di Scene

```tsx
function DayClock({ frame, nDays }) {
  // Progress arc di sudut scene — seperti HUD game
  return (
    <Billboard position={[-market_radius * 0.8, 80, -market_radius * 0.8]}>
      <Text fontSize={10} color="#38bdf8" anchorX="center">
        {`Hari ${frame + 1} / ${nDays}`}
      </Text>
    </Billboard>
  );
}
```

---

## HUD Overlay (HTML/CSS di atas Canvas)

HUD adalah div HTML yang di-`position: absolute` di atas Canvas. **Bukan** elemen Three.js.

```tsx
// components/HUD.tsx
export function HUD({ dayData, frame, nDays }) {
  if (!dayData) return null;
  return (
    <div className="absolute bottom-4 left-4 right-4 flex gap-3 pointer-events-none">
      {/* Stats cards */}
      <StatCard label="Hari" value={`${frame + 1} / ${nDays}`} accent="blue" />
      <StatCard label="Rev Toko A" value={fmtRp(dayData.revenue_a)} accent="red" />
      <StatCard label="Rev Toko B" value={fmtRp(dayData.revenue_b)} accent="green" />
      <StatCard label="WOM" value={dayData.wom_messages} accent="yellow" />
      <StatCard label="Bad Exp" value={dayData.bad_experiences} accent="orange" />
      <StatCard label="Avg Mem A" value={dayData.avg_memory_a.toFixed(3)} accent="purple" />
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const accentColors = {
    blue: 'border-blue-500 text-blue-400',
    red: 'border-red-500 text-red-400',
    green: 'border-green-500 text-green-400',
    yellow: 'border-yellow-400 text-yellow-300',
    orange: 'border-orange-400 text-orange-300',
    purple: 'border-purple-400 text-purple-300',
  };
  return (
    <div className={`bg-black/70 backdrop-blur border-l-2 ${accentColors[accent]}
                     rounded-lg px-3 py-2 min-w-[90px]`}>
      <div className="text-gray-400 text-[10px] uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold font-mono ${accentColors[accent].split(' ')[1]}`}>
        {value}
      </div>
    </div>
  );
}
```

---

## Panel Parameter Interaktif

```tsx
// components/ParameterPanel.tsx
// Sidebar kiri/kanan dengan slider real-time
// Setiap perubahan slider → debounce 500ms → re-run simulasi

export function ParameterPanel() {
  const { params, setParam, runSimulation, isLoading } = useSimulationStore();

  return (
    <aside className="w-72 bg-gray-900/90 backdrop-blur border-r border-gray-800
                       flex flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-white font-bold text-sm uppercase tracking-wider">
        ⚙️ Parameter Simulasi
      </h2>

      <ParamSlider
        label="Jumlah Agen"
        value={params.n_agents}
        min={50} max={500} step={10}
        onChange={v => setParam('n_agents', v)}
      />
      <ParamSlider
        label="Durasi (hari)"
        value={params.n_days}
        min={10} max={180} step={5}
        onChange={v => setParam('n_days', v)}
      />
      <ParamSlider
        label="Jarak A–B (m)"
        value={params.distance_between_stores}
        min={50} max={1500} step={50}
        onChange={v => setParam('distance_between_stores', v)}
      />
      <ParamSlider
        label="Intensitas Jukir"
        value={params.parking_intensity}
        min={0} max={1} step={0.05}
        onChange={v => setParam('parking_intensity', v)}
        hint="0 = pasif, 1 = sangat agresif"
      />
      <ParamSlider
        label="WOM Impact"
        value={params.wom_impact}
        min={0} max={0.5} step={0.01}
        onChange={v => setParam('wom_impact', v)}
      />
      <ParamSlider
        label="Memory Decay"
        value={params.memory_decay}
        min={0} max={0.1} step={0.005}
        onChange={v => setParam('memory_decay', v)}
      />

      <button
        onClick={runSimulation}
        disabled={isLoading}
        className="mt-2 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
                   text-white font-bold py-2.5 rounded-lg transition-colors"
      >
        {isLoading ? '⏳ Simulating...' : '▶ Jalankan Simulasi'}
      </button>

      {/* Playback controls */}
      <PlaybackControls />
    </aside>
  );
}
```

---

## Recharts Time Series (di bawah canvas)

```tsx
// components/RevenueChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function RevenueChart({ abmDaily, currentFrame }) {
  const visibleData = abmDaily.slice(0, currentFrame + 1);

  return (
    <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-800">
      <h3 className="text-gray-300 text-sm font-semibold mb-3">
        📈 Kunjungan & Revenue Harian
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={visibleData}>
          <XAxis dataKey="day" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="visits_a" name="Kunjungan A" stroke="#f87171" dot={false} strokeWidth={2} />
          <Line dataKey="visits_b" name="Kunjungan B" stroke="#4ade80" dot={false} strokeWidth={2} />
          <Line dataKey="avg_memory_a" name="Avg Mem A" stroke="#a78bfa"
                dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## Playback Controls

```tsx
// Bagian dari ParameterPanel atau komponen terpisah
function PlaybackControls() {
  const { currentFrame, isPlaying, playbackSpeed, nDays,
          setFrame, togglePlay, setSpeed } = useSimulationStore();

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button onClick={() => setFrame(0)} className="btn-control">⏮</button>
        <button onClick={togglePlay} className="btn-control flex-1">
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => setFrame(nDays - 1)} className="btn-control">⏭</button>
      </div>

      {/* Day scrubber */}
      <div>
        <label className="text-gray-400 text-xs">
          Hari: {currentFrame + 1} / {nDays}
        </label>
        <input
          type="range" min={0} max={nDays - 1} value={currentFrame}
          onChange={e => setFrame(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Speed */}
      <div>
        <label className="text-gray-400 text-xs">Speed: {playbackSpeed}x</label>
        <input
          type="range" min={1} max={8} value={playbackSpeed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>
    </div>
  );
}
```

---

## Behavior Animasi Playback

```
State Machine Playback:
  IDLE       → klik Play          → PLAYING
  PLAYING    → frame = N-1        → DONE (auto pause)
  PLAYING    → klik Pause         → PAUSED
  PAUSED     → klik Play          → PLAYING (lanjut dari frame saat ini)
  ANY        → klik ⏮             → frame = 0, PAUSED
  ANY        → klik ⏭             → frame = N-1, PAUSED
  ANY        → geser day scrubber → frame = nilai slider, PAUSED

Frame advance (di useFrame Three.js):
  Setiap X ms berdasarkan speed → frame++
  X = 800 / playbackSpeed   (speed=1: 800ms/hari, speed=8: 100ms/hari)

Coloring agen untuk frame bukan hari terakhir:
  const total = d.visits_a + d.visits_b + d.no_buy;
  const pA = d.visits_a / total;
  const pB = d.visits_b / total;
  const r = fract(Math.sin(agent.id * 127.1 + frame * 311.7) * 43758.5453);
  color = r < pA ? RED : r < pA+pB ? GREEN : GRAY;

  Catatan: hash deterministik memastikan warna konsisten per render (bukan random baru tiap frame)
```

---

## Dependencies npm yang Dibutuhkan

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "three": "^0.165.0",
    "@react-three/fiber": "^8.16.0",
    "@react-three/drei": "^9.105.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "framer-motion": "^11.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0"
  }
}
```
