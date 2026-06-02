'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/lib/simulationStore';
import { AgentSnapshot, AgentChoicesPerDay, WomEvent } from '@/lib/api';

// Shared mutable ref: phase [0,1] kemajuan hari saat ini.
// Diisi PlaybackController, dibaca AgentMesh — tanpa useState agar tidak re-render.
const dayPhaseRef = { current: 0 };

// ─── Palette siang hari (SimCity terang) ──────────────────────────────────────
const C = {
  agentA:      '#dc2626',
  agentB:      '#16a34a',
  agentStay:   '#94a3b8',
  wom:         '#f59e0b',
  storeAWall:  '#fca5a5',
  storeARoof:  '#ef4444',
  storeBWall:  '#86efac',
  storeBRoof:  '#22c55e',
  ground:      '#e8f5e9',
  road:        '#2d2d2d',   // aspal gelap (bukan hitam pekat)
  roadLine:    '#ffffff',
  sidewalk:    '#eceff1',
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
    </group>
  );
}

// ─── WOM Ring ────────────────────────────────────────────────────────────────
function WomRing({ event, index }: { event: WomEvent; index: number }) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const linePoints = useMemo(
    () => [
      new THREE.Vector3(event.storyteller_x, 2.2, event.storyteller_y),
      new THREE.Vector3(event.listener_x, 2.2, event.listener_y),
    ],
    [event.storyteller_x, event.storyteller_y, event.listener_x, event.listener_y],
  );

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const phase = (clock.getElapsedTime() * 0.7 + index * 0.13) % 1;
    const scale = 1 + phase * 2.4;
    ringRef.current.scale.set(scale, scale, scale);
    const material = ringRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.42 * (1 - phase);
  });

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(linePoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={C.wom} transparent opacity={0.28} />
      </line>
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[event.listener_x, 1.2, event.listener_y]}
      >
        <ringGeometry args={[8, 10, 48]} />
        <meshBasicMaterial
          color={C.wom}
          transparent
          opacity={0.38}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Billboard position={[event.listener_x, 18, event.listener_y]}>
        <Text fontSize={4.5} color={C.wom} outlineColor="#fff" outlineWidth={0.25}>
          WOM
        </Text>
      </Billboard>
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
  const activeWomEventsPerDay = showNoJukir ? data.wom_events_per_day_no_jukir : data.wom_events_per_day;
  const { sim_config }    = data;

  const nDays   = activeDaily.length;
  const frame   = Math.min(currentFrame, nDays - 1);
  const dayData = activeDaily[frame];
  const dayWomEvents = activeWomEventsPerDay[frame] ?? [];

  const storeAVec = new THREE.Vector3(sim_config.store_a_x, 0, sim_config.store_a_y);
  const storeBVec = new THREE.Vector3(sim_config.store_b_x, 0, sim_config.store_b_y);

  // Lookup langsung dari data simulasi Python — 100% akurat, tanpa pseudo-random
  const agentChoices: AgentChoice[] = activeSnapshots.map((a) =>
    resolveChoiceFromData(a.id, activeChoicesPerDay, frame)
  );

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

      {dayWomEvents.slice(0, 120).map((event, i) => (
        <WomRing key={event.id} event={event} index={i} />
      ))}

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
