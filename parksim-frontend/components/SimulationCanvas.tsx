'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/lib/simulationStore';
import { AgentSnapshot, AgentChoicesPerDay } from '@/lib/api';

// Shared mutable ref: phase [0,1] kemajuan hari saat ini.
// Diisi PlaybackController, dibaca AgentMesh — tanpa useState agar tidak re-render.
const dayPhaseRef = { current: 0 };

// ─── Palette siang hari (SimCity terang) ──────────────────────────────────────
const C = {
  agentA:      '#dc2626',
  agentB:      '#16a34a',
  agentStay:   '#94a3b8',
  agentBadExp: '#eab308',
  storeAWall:  '#fca5a5',
  storeARoof:  '#ef4444',
  storeBWall:  '#86efac',
  storeBRoof:  '#22c55e',
  ground:      '#e8f5e9',
  road:        '#2d2d2d',   // aspal gelap (bukan hitam pekat)
  roadLine:    '#ffffff',
  sidewalk:    '#eceff1',
  womGold:     '#f59e0b',
  tree:        '#15803d',
  bg:          '#f0fdf4',
};

// AgentChoice hanya 3 state sesuai model Python:
// 'A'    → berbelanja ke Toko A
// 'B'    → berbelanja ke Toko B
// 'stay' → tidak keluar (shopping_need_probability tidak terpenuhi)
type AgentChoice = 'A' | 'B' | 'stay';

// Lookup langsung dari data simulasi Python.
// agent_choices_per_day[frame] = Record<customer_id_string, "A"|"B">
// Agent yang tidak ada di dict = tidak belanja hari itu = "stay".
function resolveChoiceFromData(
  customerId: number,
  choicesPerDay: AgentChoicesPerDay,
  frame: number,
): AgentChoice {
  const dayChoices = choicesPerDay[frame];
  if (!dayChoices) return 'stay';
  const choice = dayChoices[String(customerId)];
  if (choice === 'A') return 'A';
  if (choice === 'B') return 'B';
  return 'stay';
}

function choiceColor(c: AgentChoice) {
  return c === 'A' ? C.agentA : c === 'B' ? C.agentB : C.agentStay;
}

// ─── Pencahayaan siang ────────────────────────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={1.8} color="#ffffff" />
      <directionalLight
        position={[200, 400, 200]} intensity={2.0} color="#fff9e6"
        castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-far={2000} shadow-camera-left={-800}
        shadow-camera-right={800} shadow-camera-top={800} shadow-camera-bottom={-800}
      />
      <hemisphereLight args={['#b9f6ca', '#e8f5e9', 0.7]} />
    </>
  );
}

// ─── Ground + Jalan Raya ──────────────────────────────────────────────────────
function Ground({ storeAX, storeBX, storeZ }: { storeAX: number; storeBX: number; storeZ: number }) {
  const midX    = (storeAX + storeBX) / 2;
  const roadLen = Math.abs(storeBX - storeAX) + 240;

  const dashCount = Math.floor(roadLen / 40);
  const dashes = useMemo(
    () => Array.from({ length: dashCount }, (_, i) => storeAX + i * 40 + 20),
    [storeAX, dashCount],
  );

  return (
    <group>
      {/* Rumput */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[midX, 0, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color={C.ground} roughness={0.9} />
      </mesh>
      {/* Aspal jalan raya */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[midX, 0.05, storeZ + 50]}>
        <planeGeometry args={[roadLen, 55]} />
        <meshStandardMaterial color={C.road} roughness={0.85} />
      </mesh>
      {/* Marka putus-putus */}
      {dashes.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, storeZ + 50]}>
          <planeGeometry args={[18, 2.5]} />
          <meshBasicMaterial color={C.roadLine} />
        </mesh>
      ))}
      {/* Trotoar Toko A */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[storeAX, 0.04, storeZ + 24]}>
        <planeGeometry args={[100, 20]} />
        <meshStandardMaterial color={C.sidewalk} roughness={0.7} />
      </mesh>
      {/* Trotoar Toko B */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[storeBX, 0.04, storeZ + 24]}>
        <planeGeometry args={[100, 20]} />
        <meshStandardMaterial color={C.sidewalk} roughness={0.7} />
      </mesh>
      <gridHelper args={[2400, 100, '#c8e6c9', '#dcedc8']} position={[midX, 0.01, 0]} />
    </group>
  );
}

// ─── Pohon ────────────────────────────────────────────────────────────────────
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.8, 12, 6]} />
        <meshStandardMaterial color="#795548" roughness={0.9} />
      </mesh>
      <mesh position={[0, 20, 0]} castShadow>
        <sphereGeometry args={[10, 8, 8]} />
        <meshStandardMaterial color={C.tree} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Decorations({ storeAX, storeBX, storeZ }: { storeAX: number; storeBX: number; storeZ: number }) {
  const trees: [number, number, number][] = useMemo(() => [
    [storeAX - 65, 0, storeZ - 20], [storeAX - 65, 0, storeZ + 10],
    [storeBX + 65, 0, storeZ - 20], [storeBX + 65, 0, storeZ + 10],
    [storeAX - 35, 0, storeZ - 60], [storeBX + 35, 0, storeZ - 60],
    [(storeAX + storeBX) / 2, 0, storeZ - 70],
  ], [storeAX, storeBX, storeZ]);

  return (
    <group>
      {trees.map((pos, i) => <Tree key={i} position={pos} />)}
    </group>
  );
}

// ─── Bangunan Toko ────────────────────────────────────────────────────────────
function StoreBuilding({ position, label, wallColor, roofColor, revenue, visits }: {
  position: [number, number, number];
  label: string;
  wallColor: string;
  roofColor: string;
  revenue: number;
  visits: number;
}) {
  const fmt = revenue >= 1_000_000
    ? `Rp ${(revenue / 1_000_000).toFixed(2)}jt`
    : `Rp ${(revenue / 1000).toFixed(0)}rb`;

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 12, 0]}>
        <boxGeometry args={[38, 24, 32]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 27, 0]}>
        <boxGeometry args={[42, 6, 36]} />
        <meshStandardMaterial color={roofColor} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 22, 16.5]}>
        <boxGeometry args={[30, 6, 1]} />
        <meshStandardMaterial color={roofColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 5, 16.6]}>
        <boxGeometry args={[8, 10, 0.4]} />
        <meshStandardMaterial color="#90a4ae" metalness={0.5} roughness={0.3} />
      </mesh>
      {[-12, 12].map((xOff, i) => (
        <mesh key={i} position={[xOff, 13, 16.6]}>
          <boxGeometry args={[8, 7, 0.4]} />
          <meshStandardMaterial color="#e0f7fa" metalness={0.3} roughness={0.1} transparent opacity={0.8} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 20]}>
        <planeGeometry args={[50, 20]} />
        <meshStandardMaterial color="#cfd8dc" roughness={0.8} />
      </mesh>
      <Billboard position={[0, 42, 0]}>
        <Text fontSize={9} color={roofColor} outlineColor="#fff" outlineWidth={0.8} fontWeight={700}>
          {`TOKO ${label}`}
        </Text>
      </Billboard>
      <Billboard position={[0, 53, 0]}>
        <Text fontSize={6} color="#1e293b" outlineColor="#fff" outlineWidth={0.5}>
          {fmt}
        </Text>
      </Billboard>
      <Billboard position={[0, 63, 0]}>
        <Text fontSize={5.5} color="#475569" outlineColor="#fff" outlineWidth={0.4}>
          {`👥 ${visits} pengunjung`}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Jukir (animasi via useRef, tidak setState) ───────────────────────────────
function JukirFigure({ storePos }: { storePos: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const swing = Math.sin(t * 1.1) * 22;
    groupRef.current.position.set(storePos[0] + swing, 0, storePos[2] + 24);
    groupRef.current.rotation.y = swing > 0 ? -Math.PI / 2 : Math.PI / 2;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 8, 0]} castShadow>
        <capsuleGeometry args={[2.5, 7, 6, 8]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 17, 0]} castShadow>
        <sphereGeometry args={[3, 10, 10]} />
        <meshStandardMaterial color="#f5deb3" roughness={0.7} />
      </mesh>
      {[-4, 4].map((x, i) => (
        <mesh key={i} position={[x, 9, 0]} castShadow>
          <capsuleGeometry args={[1, 5, 4, 6]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.6} />
        </mesh>
      ))}
      {[-2, 2].map((x, i) => (
        <mesh key={i} position={[x, 2, 0]} castShadow>
          <capsuleGeometry args={[1.2, 4, 4, 6]} />
          <meshStandardMaterial color="#1e40af" roughness={0.7} />
        </mesh>
      ))}
      <Billboard position={[0, 26, 0]}>
        <Text fontSize={4} color="#dc2626" outlineColor="#fff" outlineWidth={0.3}>JUKIR</Text>
      </Billboard>
    </group>
  );
}

// ─── Agent Mesh (animasi murni via useRef + useFrame) ─────────────────────────
// Animasi sequential: agent berangkat → toko → berhenti di toko.
// Phase [0,1] dikendalikan PlaybackController via dayPhaseRef.
function AgentMesh({ agent, choice, storeAPos, storeBPos }: {
  agent: AgentSnapshot;
  choice: AgentChoice;
  storeAPos: THREE.Vector3;
  storeBPos: THREE.Vector3;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef  = useRef<THREE.Mesh>(null!);

  const home   = useMemo(() => new THREE.Vector3(agent.x, 0, agent.y), [agent.x, agent.y]);
  const target = useMemo(() => {
    if (choice === 'A') return storeAPos.clone().setY(0);
    if (choice === 'B') return storeBPos.clone().setY(0);
    return home.clone();
  }, [choice, home, storeAPos, storeBPos]);

  const color  = choiceColor(choice);
  const bodyH  = 5;
  const tmpPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (choice === 'stay') {
      groupRef.current.position.set(home.x, bodyH + Math.sin(t * 1.2 + agent.id) * 0.3, home.z);
      return;
    }

    // Mode sequential: phase dikendalikan PlaybackController
    // Tiap agent diberi offset kecil agar tidak semua berangkat bersamaan
    const offset = (agent.id % 20) / 20 * 0.15; // spread 0–15% of cycle
    const cycle = Math.min(dayPhaseRef.current + offset, 1.0);

    // Siklus: [0,0.45] jalan ke toko · [0.45,0.60] di toko · [0.60,1.0] kembali ke home
    if (cycle < 0.45) {
      tmpPos.lerpVectors(home, target, cycle / 0.45);
    } else if (cycle < 0.60) {
      tmpPos.copy(target);
    } else {
      tmpPos.lerpVectors(target, home, (cycle - 0.60) / 0.40);
    }

    const prevX = groupRef.current.position.x;
    const prevZ = groupRef.current.position.z;
    groupRef.current.position.set(tmpPos.x, bodyH + Math.sin(t * 2.5 + agent.id) * 0.25, tmpPos.z);

    const dx = tmpPos.x - prevX;
    const dz = tmpPos.z - prevZ;
    if (dx * dx + dz * dz > 0.001) {
      groupRef.current.rotation.y = Math.atan2(dx, dz);
    }

    if (ringRef.current && agent.had_bad_experience) {
      const pulse = 1 + Math.sin(t * 5) * 0.2;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} position={[home.x, bodyH, home.z]}>
      <mesh castShadow>
        <capsuleGeometry args={[2.2, 5, 6, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 6.5, 0]} castShadow>
        <sphereGeometry args={[2.5, 10, 10]} />
        <meshStandardMaterial color="#f5deb3" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -bodyH + 0.1, 0]}>
        <circleGeometry args={[4, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.07} />
      </mesh>
      {agent.had_bad_experience && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -bodyH + 0.2, 0]}>
          <ringGeometry args={[3.5, 5.5, 32]} />
          <meshBasicMaterial color={C.agentBadExp} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

// ─── WOM System: partikel + garis arc — TANPA useState ────────────────────────
// Semua mutable state disimpan di useRef agar tidak trigger React re-render.

interface ParticleData {
  active: boolean;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
  life: number;
}

interface WOMLineData {
  active: boolean;
  fromX: number; fromZ: number;
  toX: number; toZ: number;
  life: number;
}

const MAX_PARTICLES = 120;
const MAX_LINES     = 20;

function WOMSystem({ womCount, agentPositions }: {
  womCount: number;
  agentPositions: THREE.Vector3[];
}) {
  // Particle pool as ref (no setState)
  const pool    = useRef<ParticleData[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, life: 0,
    })),
  );
  const lines   = useRef<WOMLineData[]>(
    Array.from({ length: MAX_LINES }, () => ({
      active: false, fromX: 0, fromZ: 0, toX: 0, toZ: 0, life: 0,
    })),
  );
  // Three.js objects created once
  const particleMeshes = useRef<THREE.Mesh[]>([]);
  const lineMeshes     = useRef<THREE.Line[]>([]);
  const chatDots       = useRef<THREE.Mesh[]>([]);

  // Shared geometries & materials (created once)
  const pGeo  = useMemo(() => new THREE.SphereGeometry(1.4, 5, 5), []);
  const pMat  = useMemo(() => new THREE.MeshBasicMaterial({ color: C.womGold, transparent: true }), []);
  const lMat  = useMemo(() => new THREE.LineBasicMaterial({ color: C.womGold, transparent: true }), []);
  const dotGeo = useMemo(() => new THREE.SphereGeometry(2.2, 7, 7), []);
  const dotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: C.womGold, transparent: true }), []);

  // Spawn helper — pure mutation, no setState
  const spawnBurst = (count: number) => {
    if (agentPositions.length === 0) return;
    let spawned = 0;
    for (let i = 0; i < pool.current.length && spawned < count; i++) {
      const p = pool.current[i];
      if (p.active) continue;
      const origin = agentPositions[Math.floor(Math.random() * agentPositions.length)];
      p.active = true;
      p.px = origin.x; p.py = 10; p.pz = origin.z;
      p.vx = (Math.random() - 0.5) * 35;
      p.vy = Math.random() * 22 + 5;
      p.vz = (Math.random() - 0.5) * 35;
      p.life = 1.0;
      spawned++;
    }
  };

  const spawnLine = () => {
    if (agentPositions.length < 2) return;
    for (let i = 0; i < lines.current.length; i++) {
      const l = lines.current[i];
      if (l.active) continue;
      const iA = Math.floor(Math.random() * agentPositions.length);
      let iB   = Math.floor(Math.random() * agentPositions.length);
      if (iB === iA) iB = (iA + 1) % agentPositions.length;
      l.active = true;
      l.fromX = agentPositions[iA].x; l.fromZ = agentPositions[iA].z;
      l.toX   = agentPositions[iB].x; l.toZ   = agentPositions[iB].z;
      l.life  = 1.0;
      break;
    }
  };

  // Detect new WOM events without setState
  const womRef = useRef(womCount);
  if (womCount !== womRef.current) {
    const delta = womCount - womRef.current;
    if (delta > 0 && agentPositions.length > 0) {
      spawnBurst(Math.min(delta * 3, 20));
      for (let i = 0; i < Math.min(delta, 4); i++) spawnLine();
    }
    womRef.current = womCount;
  }

  useFrame((_, dt) => {
    // Update particles
    pool.current.forEach((p, i) => {
      const mesh = particleMeshes.current[i];
      if (!mesh) return;
      if (!p.active) { mesh.visible = false; return; }

      p.px += p.vx * dt;
      p.py += p.vy * dt;
      p.pz += p.vz * dt;
      p.vx *= 0.9;
      p.vy -= 18 * dt;
      p.vz *= 0.9;
      p.life -= dt * 0.9;

      if (p.life <= 0 || p.py < 0) { p.active = false; mesh.visible = false; return; }
      mesh.visible = true;
      mesh.position.set(p.px, p.py, p.pz);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life * 0.85);
    });

    // Update WOM lines
    lines.current.forEach((l, i) => {
      const line = lineMeshes.current[i];
      const dot  = chatDots.current[i];
      if (!line || !dot) return;
      if (!l.active) { line.visible = false; dot.visible = false; return; }

      l.life -= dt * 0.65;
      if (l.life <= 0) { l.active = false; line.visible = false; dot.visible = false; return; }

      const op = Math.max(0, l.life);
      (line.material as THREE.LineBasicMaterial).opacity = op * 0.9;
      (dot.material as THREE.MeshBasicMaterial).opacity  = op;

      // Rebuild arc geometry each frame for the arc shape
      const p0 = new THREE.Vector3(l.fromX, 8,  l.fromZ);
      const p1 = new THREE.Vector3((l.fromX + l.toX) / 2, 35, (l.fromZ + l.toZ) / 2);
      const p2 = new THREE.Vector3(l.toX,   8,  l.toZ);
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const pts   = curve.getPoints(18);
      line.geometry.setFromPoints(pts);
      line.visible = true;

      dot.position.set(l.fromX, 15, l.fromZ);
      dot.visible = true;
    });
  });

  return (
    <group>
      {/* Particle meshes */}
      {Array.from({ length: MAX_PARTICLES }, (_, i) => (
        <mesh key={`p-${i}`} ref={(el) => { if (el) particleMeshes.current[i] = el; }}
          visible={false} geometry={pGeo} material={pMat} />
      ))}
      {/* Line objects */}
      {Array.from({ length: MAX_LINES }, (_, i) => (
        <group key={`l-${i}`}>
          <primitive
            object={(() => {
              if (!lineMeshes.current[i]) {
                const geo  = new THREE.BufferGeometry();
                const line = new THREE.Line(geo, lMat.clone());
                line.visible = false;
                lineMeshes.current[i] = line;
              }
              return lineMeshes.current[i];
            })()}
            ref={(el: THREE.Line | null) => { if (el) lineMeshes.current[i] = el; }}
          />
          <mesh key={`d-${i}`}
            ref={(el) => { if (el) chatDots.current[i] = el; }}
            visible={false} geometry={dotGeo} material={dotMat} />
        </group>
      ))}
    </group>
  );
}

// ─── WASD Camera ──────────────────────────────────────────────────────────────
function WASDCamera() {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const SPEED = 190;

  useEffect(() => {
    const dn = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_, delta) => {
    const k  = keys.current;
    const ry = camera.rotation.y;
    const fwd   = new THREE.Vector3(-Math.sin(ry), 0, -Math.cos(ry));
    const right = new THREE.Vector3( Math.cos(ry), 0, -Math.sin(ry));

    if (k.has('w') || k.has('arrowup'))    camera.position.addScaledVector(fwd,    SPEED * delta);
    if (k.has('s') || k.has('arrowdown'))  camera.position.addScaledVector(fwd,   -SPEED * delta);
    if (k.has('a') || k.has('arrowleft'))  camera.position.addScaledVector(right, -SPEED * delta);
    if (k.has('d') || k.has('arrowright')) camera.position.addScaledVector(right,  SPEED * delta);
    if (k.has('q')) camera.position.y = Math.min(650, camera.position.y + SPEED * delta);
    if (k.has('e')) camera.position.y = Math.max(20,  camera.position.y - SPEED * delta);
  });

  return null;
}

// ─── Playback Controller ──────────────────────────────────────────────────────
// Sequential mode: satu hari = satu siklus penuh animasi (pergi → toko → berhenti).
// dayPhaseRef diisi di sini [0,1]; saat mencapai 1.0, advance ke hari berikutnya.
function PlaybackController() {
  const { isPlaying, playbackSpeed, advanceFrame } = useSimulationStore();
  const accum = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying) return;

    const cycleDuration = 2.0 / playbackSpeed;
    accum.current += delta / cycleDuration;
    dayPhaseRef.current = Math.min(accum.current, 1.0);

    if (accum.current >= 1.0) {
      accum.current = 0;
      dayPhaseRef.current = 0;
      advanceFrame();
    }
  });

  return null;
}

// ─── Day Clock ────────────────────────────────────────────────────────────────
function DayClock({ frame, nDays, posX, posZ }: {
  frame: number; nDays: number; posX: number; posZ: number;
}) {
  return (
    <Billboard position={[posX, 85, posZ]}>
      <Text fontSize={10} color="#0f172a" outlineColor="#fff" outlineWidth={0.6} anchorX="center">
        {`Hari ${frame + 1} / ${nDays}`}
      </Text>
    </Billboard>
  );
}

// ─── Main Scene ───────────────────────────────────────────────────────────────
function Scene() {
  const { data, currentFrame, showNoJukir } = useSimulationStore();
  if (!data) return null;

  // Pilih dataset sesuai mode toggle
  const activeDaily       = showNoJukir ? data.abm_daily_no_jukir           : data.abm_daily;
  const activeSnapshots   = showNoJukir ? data.agent_snapshots_no_jukir     : data.agent_snapshots;
  const activeChoicesPerDay = showNoJukir ? data.agent_choices_per_day_no_jukir : data.agent_choices_per_day;
  const { sim_config }    = data;

  const nDays   = activeDaily.length;
  const frame   = Math.min(currentFrame, nDays - 1);
  const dayData = activeDaily[frame];

  const storeAVec = new THREE.Vector3(sim_config.store_a_x, 0, sim_config.store_a_y);
  const storeBVec = new THREE.Vector3(sim_config.store_b_x, 0, sim_config.store_b_y);

  // Lookup langsung dari data simulasi Python — 100% akurat, tanpa pseudo-random
  const agentChoices: AgentChoice[] = activeSnapshots.map((a) =>
    resolveChoiceFromData(a.id, activeChoicesPerDay, frame)
  );

  const agentVecs: THREE.Vector3[] = activeSnapshots.map((a) => new THREE.Vector3(a.x, 0, a.y));

  const storeZ = sim_config.store_a_y;

  return (
    <>
      <SceneLighting />
      <Ground storeAX={sim_config.store_a_x} storeBX={sim_config.store_b_x} storeZ={storeZ} />
      <Decorations storeAX={sim_config.store_a_x} storeBX={sim_config.store_b_x} storeZ={storeZ} />

      <StoreBuilding
        position={[sim_config.store_a_x, 0, storeZ]}
        label="A" wallColor={C.storeAWall} roofColor={C.storeARoof}
        revenue={dayData.revenue_a} visits={dayData.visits_a}
      />
      {/* Jukir hanya muncul saat mode "ada jukir" */}
      {!showNoJukir && <JukirFigure storePos={[sim_config.store_a_x, 0, storeZ]} />}

      <StoreBuilding
        position={[sim_config.store_b_x, 0, sim_config.store_b_y]}
        label="B" wallColor={C.storeBWall} roofColor={C.storeBRoof}
        revenue={dayData.revenue_b} visits={dayData.visits_b}
      />

      {activeSnapshots.map((agent, i) => (
        <AgentMesh
          key={agent.id}
          agent={agent}
          choice={agentChoices[i]}
          storeAPos={storeAVec}
          storeBPos={storeBVec}
        />
      ))}

      <WOMSystem womCount={dayData.wom_messages} agentPositions={agentVecs} />

      <DayClock frame={frame} nDays={nDays} posX={sim_config.store_a_x - 160} posZ={storeZ - 110} />
      <WASDCamera />
      <PlaybackController />
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyScene() {
  return (
    <>
      <ambientLight intensity={2.0} color="#ffffff" />
      <directionalLight position={[200, 400, 200]} intensity={1.5} color="#fff9e6" />
      <hemisphereLight args={['#b9f6ca', '#e8f5e9', 0.6]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color={C.ground} />
      </mesh>
      <gridHelper args={[2400, 100, '#c8e6c9', '#dcedc8']} />
      <Billboard position={[0, 65, 0]}>
        <Text fontSize={12} color="#166534" outlineColor="#fff" outlineWidth={0.8} anchorX="center">
          {'Klik "Jalankan Simulasi" untuk memulai'}
        </Text>
      </Billboard>
      <Billboard position={[0, 48, 0]}>
        <Text fontSize={6} color="#4b5563" outlineColor="#fff" outlineWidth={0.3} anchorX="center">
          {'WASD / ↑↓←→ = gerak  |  Q/E = naik/turun  |  scroll = zoom  |  drag = orbit'}
        </Text>
      </Billboard>
    </>
  );
}

// ─── Canvas Root ─────────────────────────────────────────────────────────────
export function SimulationCanvas() {
  const data = useSimulationStore((s) => s.data);
  const cfg  = data?.sim_config;
  const midX = cfg ? (cfg.store_a_x + cfg.store_b_x) / 2 : 0;

  return (
    <Canvas
      camera={{ position: [midX, 280, 440], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: C.bg, width: '100%', height: '100%' }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      {data ? <Scene /> : <EmptyScene />}
      <OrbitControls
        target={cfg ? [midX, 0, 0] : [0, 0, 0]}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
        enablePan panSpeed={1.5}
        dampingFactor={0.07} enableDamping
        minDistance={60} maxDistance={950}
      />
    </Canvas>
  );
}
