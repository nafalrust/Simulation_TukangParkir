'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/lib/simulationStore';
import { AgentSnapshot, DayData } from '@/lib/api';

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  agentA: '#ef4444',
  agentB: '#22c55e',
  agentNone: '#475569',
  agentBadExp: '#fbbf24',
  storeANeon: '#ff4466',
  storeBNeon: '#44ffaa',
  wom: '#fbbf24',
  ground: '#0d1117',
  grid: '#1a1a2e',
  bg: '#0a0a14',
};

function fract(x: number) { return x - Math.floor(x); }

function agentColor(
  agent: AgentSnapshot,
  dayData: DayData,
  frame: number,
  nDays: number,
): string {
  if (frame >= nDays - 1) {
    return agent.choice === 'A' ? C.agentA : agent.choice === 'B' ? C.agentB : C.agentNone;
  }
  const total = dayData.visits_a + dayData.visits_b + dayData.no_buy || 1;
  const pA = dayData.visits_a / total;
  const pB = dayData.visits_b / total;
  const r = fract(Math.sin(agent.id * 127.1 + frame * 311.7) * 43758.5453);
  return r < pA ? C.agentA : r < pA + pB ? C.agentB : C.agentNone;
}

// ─── Scene Lighting ───────────────────────────────────────────────────────────
function SceneLighting({ storeAX, storeAY, storeBX, storeBY }: {
  storeAX: number; storeAY: number; storeBX: number; storeBY: number;
}) {
  return (
    <>
      <ambientLight intensity={0.35} color="#1a1a3e" />
      <directionalLight position={[100, 200, 50]} intensity={0.6} color="#e0e8ff" castShadow
        shadow-mapSize={[2048, 2048]} />
      <pointLight position={[storeAX, 30, storeAY]} color={C.storeANeon} intensity={3} distance={250} decay={2} />
      <pointLight position={[storeBX, 30, storeBY]} color={C.storeBNeon} intensity={3} distance={250} decay={2} />
    </>
  );
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground({ radius }: { radius: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color={C.ground} roughness={0.85} metalness={0.1} />
      </mesh>
      <gridHelper args={[1200, 60, C.grid, '#16162a']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[radius - 2, radius + 2, 128]} />
        <meshBasicMaterial color="#1e2d40" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ─── Revenue Display ──────────────────────────────────────────────────────────
function RevenueDisplay({ value, color }: { value: number; color: string }) {
  const formatted = value >= 1_000_000
    ? `Rp ${(value / 1_000_000).toFixed(2)}jt`
    : `Rp ${(value / 1000).toFixed(0)}rb`;
  return (
    <Text fontSize={5} color={color} anchorX="center" anchorY="middle" renderOrder={2}>
      {formatted}
    </Text>
  );
}

// ─── Store Building ───────────────────────────────────────────────────────────
function StoreBuilding({
  position, label, color, neonColor, revenue,
}: {
  position: [number, number, number];
  label: string;
  color: string;
  neonColor: string;
  revenue: number;
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 10, 0]}>
        <boxGeometry args={[32, 20, 28]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 21, 0]}>
        <boxGeometry args={[34, 2, 30]} />
        <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={0.8} />
      </mesh>
      <Billboard position={[0, 34, 0]}>
        <Text fontSize={7} color={neonColor} outlineColor="#000" outlineWidth={0.4}>
          {`TOKO ${label}`}
        </Text>
      </Billboard>
      <Billboard position={[0, 44, 0]}>
        <RevenueDisplay value={revenue} color={neonColor} />
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color={neonColor} transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

// ─── Jukir Figure ─────────────────────────────────────────────────────────────
function JukirFigure({ storePos }: { storePos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.position.x = storePos[0] + Math.sin(t * 0.8) * 20;
    ref.current.rotation.y = Math.sin(t * 0.8) > 0 ? 0 : Math.PI;
  });
  return (
    <group ref={ref} position={[storePos[0], 0, storePos[2] + 22]}>
      <mesh position={[0, 8, 0]} castShadow>
        <capsuleGeometry args={[3, 8, 4, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[0, 18, 0]}>
        <sphereGeometry args={[3.5, 8, 8]} />
        <meshStandardMaterial color="#d97706" />
      </mesh>
    </group>
  );
}

// ─── Single Agent Mesh ────────────────────────────────────────────────────────
function AgentMesh({
  agent, dayData, frame, nDays,
}: {
  agent: AgentSnapshot;
  dayData: DayData;
  frame: number;
  nDays: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const color = useMemo(
    () => agentColor(agent, dayData, frame, nDays),
    [agent, dayData, frame, nDays],
  );
  const size = 3 + Math.abs(agent.memory_a || 0) * 4;
  const pos: [number, number, number] = [agent.x, size / 2 + 0.5, agent.y];
  const showBadRing = agent.had_bad_experience && frame >= nDays - 1;

  useFrame(({ clock }) => {
    if (ringRef.current && showBadRing) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.18;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={pos}>
      <mesh castShadow>
        <sphereGeometry args={[size, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35}
          roughness={0.3} metalness={0.4} />
      </mesh>
      {showBadRing && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size + 1, size + 3, 32]} />
          <meshBasicMaterial color={C.agentBadExp} transparent opacity={0.85} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -size / 2 + 0.1, 0]}>
        <circleGeometry args={[size * 1.2, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ─── Agent Layer ──────────────────────────────────────────────────────────────
function AgentLayer({
  agents, dayData, frame, nDays,
}: {
  agents: AgentSnapshot[];
  dayData: DayData;
  frame: number;
  nDays: number;
}) {
  return (
    <group>
      {agents.map((agent) => (
        <AgentMesh key={agent.id} agent={agent} dayData={dayData} frame={frame} nDays={nDays} />
      ))}
    </group>
  );
}

// ─── WOM Particle ─────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  pos: [number, number, number];
  vel: [number, number, number];
  life: number;
}

function WOMParticleSystem({ womCount, agentPositions }: {
  womCount: number;
  agentPositions: [number, number, number][];
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevWom = useRef(0);

  useEffect(() => {
    if (womCount > prevWom.current && agentPositions.length > 0) {
      const burst = Math.min(womCount * 2, 30);
      const newPs: Particle[] = Array.from({ length: burst }, (_, i) => {
        const origin = agentPositions[Math.floor(Math.random() * agentPositions.length)];
        return {
          id: Date.now() + i,
          pos: [...origin] as [number, number, number],
          vel: [
            (Math.random() - 0.5) * 50,
            Math.random() * 40 + 10,
            (Math.random() - 0.5) * 50,
          ],
          life: 1.0,
        };
      });
      setParticles((prev) => [...prev, ...newPs].slice(-150));
    }
    prevWom.current = womCount;
  }, [womCount, agentPositions]);

  useFrame((_, delta) => {
    setParticles((prev) =>
      prev
        .map((p) => ({
          ...p,
          pos: [
            p.pos[0] + p.vel[0] * delta,
            p.pos[1] + p.vel[1] * delta,
            p.pos[2] + p.vel[2] * delta,
          ] as [number, number, number],
          vel: [p.vel[0] * 0.92, p.vel[1] - 30 * delta, p.vel[2] * 0.92] as [number, number, number],
          life: p.life - delta * 0.8,
        }))
        .filter((p) => p.life > 0),
    );
  });

  return (
    <group>
      {particles.map((p) => (
        <mesh key={p.id} position={p.pos}>
          <sphereGeometry args={[1.5, 6, 6]} />
          <meshBasicMaterial color={C.wom} transparent opacity={Math.max(0, p.life)} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Day Clock ────────────────────────────────────────────────────────────────
function DayClock({ frame, nDays, radius }: { frame: number; nDays: number; radius: number }) {
  return (
    <Billboard position={[-radius * 0.75, 80, -radius * 0.75]}>
      <Text fontSize={9} color="#38bdf8" anchorX="center">
        {`Hari ${frame + 1} / ${nDays}`}
      </Text>
    </Billboard>
  );
}

// ─── Playback Controller (inside Canvas) ──────────────────────────────────────
function PlaybackController() {
  const { isPlaying, playbackSpeed, advanceFrame } = useSimulationStore();
  const accumRef = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    accumRef.current += delta;
    const interval = 0.8 / playbackSpeed;
    if (accumRef.current >= interval) {
      accumRef.current = 0;
      advanceFrame();
    }
  });

  return null;
}

// ─── Inner Scene (access store inside Canvas context) ─────────────────────────
function Scene() {
  const { data, currentFrame } = useSimulationStore();
  if (!data) return null;

  const { abm_daily, agent_snapshots, sim_config } = data;
  const nDays = abm_daily.length;
  const frame = Math.min(currentFrame, nDays - 1);
  const dayData = abm_daily[frame];

  const storeAPos: [number, number, number] = [sim_config.store_a_x, 0, sim_config.store_a_y];
  const storeBPos: [number, number, number] = [sim_config.store_b_x, 0, sim_config.store_b_y];

  const agentPositions = useMemo<[number, number, number][]>(
    () => agent_snapshots.map((a) => [a.x, 4, a.y]),
    [agent_snapshots],
  );

  return (
    <>
      <SceneLighting
        storeAX={sim_config.store_a_x} storeAY={sim_config.store_a_y}
        storeBX={sim_config.store_b_x} storeBY={sim_config.store_b_y}
      />
      <Ground radius={sim_config.market_radius} />
      <StoreBuilding
        position={storeAPos}
        label="A"
        color="#7f1d1d"
        neonColor={C.storeANeon}
        revenue={dayData.revenue_a}
      />
      <JukirFigure storePos={storeAPos} />
      <StoreBuilding
        position={storeBPos}
        label="B"
        color="#14532d"
        neonColor={C.storeBNeon}
        revenue={dayData.revenue_b}
      />
      <AgentLayer
        agents={agent_snapshots}
        dayData={dayData}
        frame={frame}
        nDays={nDays}
      />
      <WOMParticleSystem womCount={dayData.wom_messages} agentPositions={agentPositions} />
      <DayClock frame={frame} nDays={nDays} radius={sim_config.market_radius} />
      <PlaybackController />
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyScene() {
  return (
    <>
      <ambientLight intensity={0.3} color="#1a1a3e" />
      <Stars radius={300} depth={60} count={2000} factor={3} fade />
      <Billboard position={[0, 40, 0]}>
        <Text fontSize={8} color="#38bdf8" anchorX="center">
          {'Klik "Jalankan Simulasi" untuk memulai'}
        </Text>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color={C.ground} />
      </mesh>
      <gridHelper args={[1200, 60, C.grid, '#16162a']} />
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function SimulationCanvas() {
  const { data } = useSimulationStore();

  return (
    <Canvas
      camera={{ position: [0, 180, 300], fov: 45 }}
      shadows
      gl={{ antialias: true }}
      style={{ background: C.bg, width: '100%', height: '100%' }}
    >
      <fog attach="fog" args={[C.bg, 500, 1000]} />
      <Stars radius={300} depth={60} count={2000} factor={3} fade />
      {data ? <Scene /> : <EmptyScene />}
      <OrbitControls
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enablePan
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
