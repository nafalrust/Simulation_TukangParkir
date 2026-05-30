'use client';

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/lib/simulationStore';
import { AgentSnapshot, DayData } from '@/lib/api';

// ─── Palette terang (SimCity / open-world siang hari) ─────────────────────────
const C = {
  agentA:        '#dc2626',   // merah jenuh — pergi ke Toko A
  agentB:        '#16a34a',   // hijau jenuh — pergi ke Toko B
  agentAverse:   '#f97316',   // oranye — mau beli tapi mundur karena jukir
  agentStay:     '#94a3b8',   // abu biru — stay di rumah
  agentBadExp:   '#eab308',   // kuning — ring bad experience
  storeAWall:    '#fca5a5',   // merah muda — dinding Toko A
  storeARoof:    '#ef4444',   // merah — atap Toko A
  storeBWall:    '#86efac',   // hijau muda — dinding Toko B
  storeBRoof:    '#22c55e',   // hijau — atap Toko B
  ground:        '#e8f5e9',   // hijau pucat — rumput/tanah
  road:          '#b0bec5',   // abu — aspal jalan
  roadLine:      '#ffffff',   // putih — marka jalan
  sidewalk:      '#eceff1',   // abu sangat terang — trotoar
  wom:           '#fbbf24',   // kuning emas — partikel WOM
  womLine:       '#f59e0b',   // garis interaksi sosial
  tree:          '#15803d',   // hijau tua — pohon
  shadow:        'rgba(0,0,0,0.08)',
  bg:            '#f0fdf4',   // latar putih kehijauan terang
};

function fract(x: number) { return x - Math.floor(x); }

// Deterministic agent color berdasarkan pilihan
function resolveChoice(
  agent: AgentSnapshot,
  dayData: DayData,
  frame: number,
  nDays: number,
): 'A' | 'B' | 'averse' | 'stay' {
  if (frame >= nDays - 1) {
    if (agent.choice === 'A') return 'A';
    if (agent.choice === 'B') return 'B';
    if (agent.no_buy_reason === 'parking_aversion') return 'averse';
    return 'stay';
  }
  const total = dayData.visits_a + dayData.visits_b + dayData.no_buy || 1;
  const pA = dayData.visits_a / total;
  const pB = dayData.visits_b / total;
  const r = fract(Math.sin(agent.id * 127.1 + frame * 311.7) * 43758.5453);
  if (r < pA) return 'A';
  if (r < pA + pB) return 'B';
  // rough split: half averse, half stay based on agent characteristic
  return agent.parking_aversion > 0.5 ? 'averse' : 'stay';
}

function choiceColor(c: 'A' | 'B' | 'averse' | 'stay') {
  return c === 'A' ? C.agentA : c === 'B' ? C.agentB : c === 'averse' ? C.agentAverse : C.agentStay;
}

// ─── Pencahayaan siang hari ────────────────────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={1.8} color="#ffffff" />
      <directionalLight
        position={[200, 400, 200]}
        intensity={2.2}
        color="#fff9e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={2000}
        shadow-camera-left={-800}
        shadow-camera-right={800}
        shadow-camera-top={800}
        shadow-camera-bottom={-800}
      />
      <hemisphereLight args={['#b9f6ca', '#e8f5e9', 0.8]} />
    </>
  );
}

// ─── Ground: rumput + jalan raya ──────────────────────────────────────────────
function Ground({ storeAX, storeBX, storeZ }: { storeAX: number; storeBX: number; storeZ: number }) {
  const midX = (storeAX + storeBX) / 2;
  const roadLen = Math.abs(storeBX - storeAX) + 200;
  const roadWidth = 50;
  const sidewalkWidth = 18;

  return (
    <group>
      {/* Rumput latar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[midX, 0, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color={C.ground} roughness={0.9} />
      </mesh>

      {/* Aspal jalan raya di depan kedua toko */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[midX, 0.05, storeZ + 45]} receiveShadow>
        <planeGeometry args={[roadLen, roadWidth]} />
        <meshStandardMaterial color={C.road} roughness={0.85} />
      </mesh>

      {/* Marka jalan tengah — putus-putus */}
      {Array.from({ length: Math.floor(roadLen / 40) }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[storeAX + i * 40 + 20, 0.07, storeZ + 45]}
        >
          <planeGeometry args={[18, 2.5]} />
          <meshBasicMaterial color={C.roadLine} />
        </mesh>
      ))}

      {/* Trotoar depan Toko A */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[storeAX, 0.04, storeZ + 22]} receiveShadow>
        <planeGeometry args={[100, sidewalkWidth]} />
        <meshStandardMaterial color={C.sidewalk} roughness={0.7} />
      </mesh>

      {/* Trotoar depan Toko B */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[storeBX, 0.04, storeZ + 22]} receiveShadow>
        <planeGeometry args={[100, sidewalkWidth]} />
        <meshStandardMaterial color={C.sidewalk} roughness={0.7} />
      </mesh>

      {/* Grid tanah tipis */}
      <gridHelper args={[2000, 80, '#c8e6c9', '#dcedc8']} position={[midX, 0.01, 0]} />
    </group>
  );
}

// ─── Pohon dekoratif ──────────────────────────────────────────────────────────
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[1, 1.5, 12, 6]} />
        <meshStandardMaterial color="#795548" roughness={0.9} />
      </mesh>
      <mesh position={[0, 18, 0]} castShadow>
        <sphereGeometry args={[10, 8, 8]} />
        <meshStandardMaterial color={C.tree} roughness={0.85} />
      </mesh>
    </group>
  );
}

// ─── Toko (SimCity-style, cerah & detail) ────────────────────────────────────
function StoreBuilding({
  position, label, wallColor, roofColor, revenue, hasJukir,
}: {
  position: [number, number, number];
  label: string;
  wallColor: string;
  roofColor: string;
  revenue: number;
  hasJukir?: boolean;
}) {
  const fmtRevenue = revenue >= 1_000_000
    ? `Rp ${(revenue / 1_000_000).toFixed(2)}jt`
    : `Rp ${(revenue / 1000).toFixed(0)}rb`;

  return (
    <group position={position}>
      {/* Bangunan utama */}
      <mesh castShadow receiveShadow position={[0, 12, 0]}>
        <boxGeometry args={[38, 24, 32]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} />
      </mesh>
      {/* Atap miring */}
      <mesh castShadow position={[0, 27, 0]}>
        <boxGeometry args={[42, 6, 36]} />
        <meshStandardMaterial color={roofColor} roughness={0.4} />
      </mesh>
      {/* Papan nama */}
      <mesh castShadow position={[0, 22, 16.5]}>
        <boxGeometry args={[30, 6, 1]} />
        <meshStandardMaterial color={roofColor} roughness={0.3} />
      </mesh>
      {/* Pintu */}
      <mesh position={[0, 5, 16.6]}>
        <boxGeometry args={[8, 10, 0.4]} />
        <meshStandardMaterial color="#90a4ae" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Jendela kiri & kanan */}
      {[-12, 12].map((xOff, i) => (
        <mesh key={i} position={[xOff, 13, 16.6]}>
          <boxGeometry args={[8, 7, 0.4]} />
          <meshStandardMaterial color="#e0f7fa" metalness={0.3} roughness={0.1} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* Teks nama toko */}
      <Billboard position={[0, 42, 0]}>
        <Text fontSize={9} color={roofColor} outlineColor="#fff" outlineWidth={0.8} fontWeight="bold">
          {`TOKO ${label}`}
        </Text>
      </Billboard>
      {/* Revenue floating */}
      <Billboard position={[0, 52, 0]}>
        <Text fontSize={6} color="#1e293b" outlineColor="#fff" outlineWidth={0.5}>
          {fmtRevenue}
        </Text>
      </Billboard>
      {/* Area parkir di depan toko */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 20]} receiveShadow>
        <planeGeometry args={[50, 20]} />
        <meshStandardMaterial color="#cfd8dc" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Jukir (tukang parkir liar) — animasi bolak-balik di depan Toko A ─────────
function JukirFigure({ storePos }: { storePos: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);
  const vest = '#f59e0b'; // rompi kuning

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const swing = Math.sin(t * 1.1) * 22;
    groupRef.current.position.x = storePos[0] + swing;
    groupRef.current.position.z = storePos[2] + 22;
    groupRef.current.rotation.y = swing > 0 ? -Math.PI / 2 : Math.PI / 2;
  });

  return (
    <group ref={groupRef}>
      {/* Tubuh */}
      <mesh position={[0, 8, 0]} castShadow>
        <capsuleGeometry args={[2.5, 7, 6, 8]} />
        <meshStandardMaterial color={vest} roughness={0.6} />
      </mesh>
      {/* Kepala */}
      <mesh position={[0, 17, 0]} castShadow>
        <sphereGeometry args={[3, 10, 10]} />
        <meshStandardMaterial color="#f5deb3" roughness={0.7} />
      </mesh>
      {/* Tangan kiri — mengayun */}
      <mesh position={[-4, 9, 0]} castShadow>
        <capsuleGeometry args={[1, 5, 4, 6]} />
        <meshStandardMaterial color={vest} roughness={0.6} />
      </mesh>
      {/* Tangan kanan */}
      <mesh position={[4, 9, 0]} castShadow>
        <capsuleGeometry args={[1, 5, 4, 6]} />
        <meshStandardMaterial color={vest} roughness={0.6} />
      </mesh>
      {/* Kaki */}
      {[-2, 2].map((xOff, i) => (
        <mesh key={i} position={[xOff, 2, 0]} castShadow>
          <capsuleGeometry args={[1.2, 4, 4, 6]} />
          <meshStandardMaterial color="#1e40af" roughness={0.7} />
        </mesh>
      ))}
      <Billboard position={[0, 26, 0]}>
        <Text fontSize={4} color="#dc2626" outlineColor="#fff" outlineWidth={0.3}>
          JUKIR
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Agent Mesh dengan animasi gerak ke toko ──────────────────────────────────
function AgentMesh({
  agent, choice, storeAPos, storeBPos, elapsedRef,
}: {
  agent: AgentSnapshot;
  choice: 'A' | 'B' | 'averse' | 'stay';
  storeAPos: THREE.Vector3;
  storeBPos: THREE.Vector3;
  elapsedRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef  = useRef<THREE.Mesh>(null!);

  // Posisi rumah agen (statis)
  const home = useMemo(() => new THREE.Vector3(agent.x, 0, agent.y), [agent.x, agent.y]);

  // Target bergerak per choice
  const target = useMemo(() => {
    if (choice === 'A') return storeAPos.clone().setY(0);
    if (choice === 'B') return storeBPos.clone().setY(0);
    if (choice === 'averse') {
      // Mendekati Toko A setengah jalan lalu balik
      return home.clone().lerp(storeAPos.clone().setY(0), 0.45);
    }
    return home.clone();
  }, [choice, home, storeAPos, storeBPos]);

  const color = choiceColor(choice);
  const bodyH = 5;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (choice === 'stay') {
      // Diam di tempat, sedikit idle bob
      groupRef.current.position.set(home.x, bodyH, home.z);
      groupRef.current.position.y = bodyH + Math.sin(t * 1.2 + agent.id) * 0.3;
      return;
    }

    if (choice === 'averse') {
      // Pergi ke setengah jalan → berhenti → balik ke rumah — siklus terus
      const cycle = (t * 0.4 + agent.id * 0.17) % 1;
      let pos: THREE.Vector3;
      if (cycle < 0.35) {
        // Fase 1: jalan menuju Toko A setengah jalan
        pos = home.clone().lerp(target, Math.min(cycle / 0.35, 1));
      } else if (cycle < 0.55) {
        // Fase 2: diam sebentar (ragu-ragu), kepala goyang
        pos = target.clone();
      } else {
        // Fase 3: balik ke rumah
        pos = target.clone().lerp(home, Math.min((cycle - 0.55) / 0.45, 1));
      }
      groupRef.current.position.set(pos.x, bodyH + Math.sin(t * 2) * 0.2, pos.z);
      // Hadap ke arah pergerakan
      const dir = pos.clone().sub(groupRef.current.position);
      if (dir.lengthSq() > 0.01) groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      return;
    }

    // Choice A atau B: berjalan menuju toko, lalu balik ke rumah
    const cycle = (t * 0.35 + agent.id * 0.13) % 1;
    let pos: THREE.Vector3;
    if (cycle < 0.45) {
      pos = home.clone().lerp(target, Math.min(cycle / 0.45, 1));
    } else if (cycle < 0.6) {
      pos = target.clone();
    } else {
      pos = target.clone().lerp(home, Math.min((cycle - 0.6) / 0.4, 1));
    }
    groupRef.current.position.set(pos.x, bodyH + Math.sin(t * 2.5 + agent.id) * 0.3, pos.z);

    // Wajah menghadap arah perjalanan
    const prev = groupRef.current.position.clone();
    const nextPos = home.clone().lerp(target, Math.min((cycle + 0.01) / 0.45, 1));
    const faceDir = nextPos.clone().sub(prev);
    if (faceDir.lengthSq() > 0.01) {
      groupRef.current.rotation.y = Math.atan2(faceDir.x, faceDir.z);
    }

    // Pulse ring bad experience
    if (ringRef.current && agent.had_bad_experience) {
      const pulse = 1 + Math.sin(t * 5) * 0.2;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} position={[home.x, bodyH, home.z]}>
      {/* Tubuh */}
      <mesh castShadow>
        <capsuleGeometry args={[2.2, 5, 6, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Kepala */}
      <mesh position={[0, 6.5, 0]} castShadow>
        <sphereGeometry args={[2.5, 10, 10]} />
        <meshStandardMaterial color="#f5deb3" roughness={0.6} />
      </mesh>
      {/* Shadow blob di tanah */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -bodyH + 0.1, 0]}>
        <circleGeometry args={[4, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.08} />
      </mesh>
      {/* Ring bad experience */}
      {agent.had_bad_experience && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -bodyH + 0.2, 0]}>
          <ringGeometry args={[3.5, 5.5, 32]} />
          <meshBasicMaterial color={C.agentBadExp} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

// ─── WOM Interaction Lines — garis interaksi sosial antar agen ─────────────────
interface WOMEvent {
  id: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  life: number;
  maxLife: number;
}

function WOMLines({ womCount, agentPositions, agents }: {
  womCount: number;
  agentPositions: THREE.Vector3[];
  agents: AgentSnapshot[];
}) {
  const [events, setEvents] = useState<WOMEvent[]>([]);
  const prevWom = useRef(0);
  const lineRefs = useRef<Map<number, THREE.Line>>(new Map());

  useEffect(() => {
    if (womCount > prevWom.current && agentPositions.length >= 2) {
      const count = Math.min(womCount - prevWom.current, 8);
      const newEvents: WOMEvent[] = Array.from({ length: count }, (_, i) => {
        const iA = Math.floor(Math.random() * agentPositions.length);
        let iB = Math.floor(Math.random() * agentPositions.length);
        if (iB === iA) iB = (iA + 1) % agentPositions.length;
        return {
          id: Date.now() + i,
          fromPos: agentPositions[iA].clone(),
          toPos: agentPositions[iB].clone(),
          life: 1.0,
          maxLife: 1.0,
        };
      });
      setEvents((prev) => [...prev, ...newEvents].slice(-20));
    }
    prevWom.current = womCount;
  }, [womCount, agentPositions]);

  useFrame((_, delta) => {
    setEvents((prev) =>
      prev.map((e) => ({ ...e, life: e.life - delta * 0.7 })).filter((e) => e.life > 0),
    );
  });

  return (
    <group>
      {events.map((ev) => {
        const points = [
          new THREE.Vector3(ev.fromPos.x, 8, ev.fromPos.z),
          new THREE.Vector3((ev.fromPos.x + ev.toPos.x) / 2, 30, (ev.fromPos.z + ev.toPos.z) / 2),
          new THREE.Vector3(ev.toPos.x, 8, ev.toPos.z),
        ];
        const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
        const pts = curve.getPoints(20);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <group key={ev.id}>
            <primitive object={new THREE.Line(geo, new THREE.LineBasicMaterial({
              color: C.womLine,
              transparent: true,
              opacity: Math.max(0, ev.life) * 0.9,
            }))} />
            {/* Bola chat di titik asal */}
            <mesh position={[ev.fromPos.x, 14, ev.fromPos.z]}>
              <sphereGeometry args={[2, 8, 8]} />
              <meshBasicMaterial color={C.wom} transparent opacity={Math.max(0, ev.life)} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ─── WOM Partikel burst kecil ─────────────────────────────────────────────────
interface Particle { id: number; pos: THREE.Vector3; vel: THREE.Vector3; life: number; }

function WOMParticles({ womCount, agentPositions }: {
  womCount: number;
  agentPositions: THREE.Vector3[];
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevWom = useRef(0);

  useEffect(() => {
    if (womCount > prevWom.current && agentPositions.length > 0) {
      const burst = Math.min((womCount - prevWom.current) * 3, 25);
      const newPs = Array.from({ length: burst }, (_, i) => {
        const origin = agentPositions[Math.floor(Math.random() * agentPositions.length)];
        return {
          id: Date.now() + i,
          pos: origin.clone().setY(10),
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 30,
            Math.random() * 25 + 5,
            (Math.random() - 0.5) * 30,
          ),
          life: 1.0,
        };
      });
      setParticles((prev) => [...prev, ...newPs].slice(-100));
    }
    prevWom.current = womCount;
  }, [womCount, agentPositions]);

  useFrame((_, delta) => {
    setParticles((prev) =>
      prev.map((p) => ({
        ...p,
        pos: p.pos.clone().addScaledVector(p.vel, delta),
        vel: new THREE.Vector3(p.vel.x * 0.9, p.vel.y - 20 * delta, p.vel.z * 0.9),
        life: p.life - delta * 1.0,
      })).filter((p) => p.life > 0),
    );
  });

  return (
    <group>
      {particles.map((p) => (
        <mesh key={p.id} position={p.pos}>
          <sphereGeometry args={[1.2, 5, 5]} />
          <meshBasicMaterial color={C.wom} transparent opacity={Math.max(0, p.life * 0.9)} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Pohon dekorasi di sekitar scene ─────────────────────────────────────────
function Decorations({ storeAX, storeBX, storeZ }: {
  storeAX: number; storeBX: number; storeZ: number;
}) {
  const trees: [number, number, number][] = [
    [storeAX - 60, 0, storeZ - 20], [storeAX - 60, 0, storeZ + 10],
    [storeBX + 60, 0, storeZ - 20], [storeBX + 60, 0, storeZ + 10],
    [storeAX - 30, 0, storeZ - 50], [storeBX + 30, 0, storeZ - 50],
    [(storeAX + storeBX) / 2, 0, storeZ - 60],
  ];
  return (
    <group>
      {trees.map((pos, i) => <Tree key={i} position={pos} />)}
    </group>
  );
}

// ─── WASD Camera Controller ───────────────────────────────────────────────────
function WASDCamera() {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const SPEED = 180;

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const onUp   = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  useFrame((_, delta) => {
    const k = keys.current;
    const forward = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
    const right   = new THREE.Vector3( Math.cos(camera.rotation.y), 0, -Math.sin(camera.rotation.y));

    if (k.has('w') || k.has('arrowup'))    camera.position.addScaledVector(forward, SPEED * delta);
    if (k.has('s') || k.has('arrowdown'))  camera.position.addScaledVector(forward, -SPEED * delta);
    if (k.has('a') || k.has('arrowleft'))  camera.position.addScaledVector(right,  -SPEED * delta);
    if (k.has('d') || k.has('arrowright')) camera.position.addScaledVector(right,   SPEED * delta);
    if (k.has('q')) camera.position.y += SPEED * delta;
    if (k.has('e')) camera.position.y -= SPEED * delta;

    // Clamp ketinggian kamera
    camera.position.y = Math.max(20, Math.min(600, camera.position.y));
  });

  return null;
}

// ─── Playback Controller ─────────────────────────────────────────────────────
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

// ─── Day Clock ───────────────────────────────────────────────────────────────
function DayClock({ frame, nDays, posX, posZ }: {
  frame: number; nDays: number; posX: number; posZ: number;
}) {
  return (
    <Billboard position={[posX, 80, posZ]}>
      <Text fontSize={10} color="#0f172a" outlineColor="#fff" outlineWidth={0.5} anchorX="center">
        {`Hari ${frame + 1} / ${nDays}`}
      </Text>
    </Billboard>
  );
}

// ─── Main Scene ───────────────────────────────────────────────────────────────
function Scene() {
  const { data, currentFrame } = useSimulationStore();
  if (!data) return null;

  const { abm_daily, agent_snapshots, sim_config } = data;
  const nDays = abm_daily.length;
  const frame = Math.min(currentFrame, nDays - 1);
  const dayData = abm_daily[frame];
  const elapsedRef = useRef(0);

  const storeAVec = useMemo(
    () => new THREE.Vector3(sim_config.store_a_x, 0, sim_config.store_a_y),
    [sim_config],
  );
  const storeBVec = useMemo(
    () => new THREE.Vector3(sim_config.store_b_x, 0, sim_config.store_b_y),
    [sim_config],
  );
  const storeZ = sim_config.store_a_y; // biasanya 0

  // Posisi agen sebagai Vector3 untuk WOM lines
  const agentVecs = useMemo<THREE.Vector3[]>(
    () => agent_snapshots.map((a) => new THREE.Vector3(a.x, 0, a.y)),
    [agent_snapshots],
  );

  // Resolve choice tiap agen
  const agentChoices = useMemo<('A' | 'B' | 'averse' | 'stay')[]>(
    () => agent_snapshots.map((a) => resolveChoice(a, dayData, frame, nDays)),
    [agent_snapshots, dayData, frame, nDays],
  );

  const midX = (sim_config.store_a_x + sim_config.store_b_x) / 2;

  return (
    <>
      <SceneLighting />
      <Ground storeAX={sim_config.store_a_x} storeBX={sim_config.store_b_x} storeZ={storeZ} />
      <Decorations storeAX={sim_config.store_a_x} storeBX={sim_config.store_b_x} storeZ={storeZ} />

      {/* Toko A */}
      <StoreBuilding
        position={[sim_config.store_a_x, 0, sim_config.store_a_y]}
        label="A"
        wallColor={C.storeAWall}
        roofColor={C.storeARoof}
        revenue={dayData.revenue_a}
        hasJukir
      />
      <JukirFigure storePos={[sim_config.store_a_x, 0, sim_config.store_a_y]} />

      {/* Toko B */}
      <StoreBuilding
        position={[sim_config.store_b_x, 0, sim_config.store_b_y]}
        label="B"
        wallColor={C.storeBWall}
        roofColor={C.storeBRoof}
        revenue={dayData.revenue_b}
      />

      {/* Semua agen */}
      {agent_snapshots.map((agent, i) => (
        <AgentMesh
          key={agent.id}
          agent={agent}
          choice={agentChoices[i]}
          storeAPos={storeAVec}
          storeBPos={storeBVec}
          elapsedRef={elapsedRef}
        />
      ))}

      {/* Interaksi WOM — garis arc antar agen */}
      <WOMLines
        womCount={dayData.wom_messages}
        agentPositions={agentVecs}
        agents={agent_snapshots}
      />
      {/* Partikel WOM burst */}
      <WOMParticles womCount={dayData.wom_messages} agentPositions={agentVecs} />

      {/* HUD 3D — hari saat ini */}
      <DayClock frame={frame} nDays={nDays} posX={sim_config.store_a_x - 150} posZ={storeZ - 100} />

      <WASDCamera />
      <PlaybackController />
    </>
  );
}

// ─── Empty State (sebelum simulasi dijalankan) ────────────────────────────────
function EmptyScene() {
  return (
    <>
      <ambientLight intensity={2.0} color="#ffffff" />
      <directionalLight position={[200, 400, 200]} intensity={1.5} color="#fff9e6" />
      <hemisphereLight args={['#b9f6ca', '#e8f5e9', 0.6]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color={C.ground} />
      </mesh>
      <gridHelper args={[2000, 80, '#c8e6c9', '#dcedc8']} />
      <Billboard position={[0, 60, 0]}>
        <Text fontSize={12} color="#166534" outlineColor="#fff" outlineWidth={0.8} anchorX="center">
          {'Klik "Jalankan Simulasi" untuk memulai'}
        </Text>
      </Billboard>
      <Billboard position={[0, 44, 0]}>
        <Text fontSize={6} color="#4b5563" outlineColor="#fff" outlineWidth={0.3} anchorX="center">
          {'WASD / Arrow Keys = gerak kamera  |  Q/E = naik/turun  |  Mouse = orbit & zoom'}
        </Text>
      </Billboard>
    </>
  );
}

// ─── Canvas Root ─────────────────────────────────────────────────────────────
export function SimulationCanvas() {
  const { data, sim_config: cfg } = useSimulationStore((s) => ({
    data: s.data,
    sim_config: s.data?.sim_config,
  }));

  // Posisi kamera awal antara dua toko
  const midX = cfg ? (cfg.store_a_x + cfg.store_b_x) / 2 : 0;
  const camPos: [number, number, number] = [midX, 280, 420];

  return (
    <Canvas
      camera={{ position: camPos, fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: C.bg, width: '100%', height: '100%' }}
      onCreated={({ gl }) => { gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}
    >
      {data ? <Scene /> : <EmptyScene />}
      <OrbitControls
        target={cfg ? [(cfg.store_a_x + cfg.store_b_x) / 2, 0, 0] : [0, 0, 0]}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
        enablePan
        panSpeed={1.5}
        dampingFactor={0.07}
        enableDamping
        minDistance={60}
        maxDistance={900}
      />
    </Canvas>
  );
}
