const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface SimulateRequest {
  // Populasi & durasi
  n_agents: number;
  n_days: number;
  market_radius: number;
  distance_to_B: number;

  // Toko
  parking_fee: number;
  attractiveness_A: number;
  attractiveness_B: number;

  // Agen
  parking_aversion: number;
  initial_risk_a: number;
  shopping_prob: number;

  // Memori
  memory_strength: number;
  memory_decay: number;
  direct_experience_impact: number;

  // Sosial (WOM)
  wom_probability: number;
  wom_strength: number;
  num_contacts: number;

  // Bobot skor
  weight_distance: number;
  weight_parking_aversion: number;
  weight_parking_fee: number;
  weight_risk: number;
  weight_attractiveness: number;

  seed: number;
}

export interface DayData {
  day: number;
  visits_a: number;
  visits_b: number;
  no_buy: number;
  bad_experiences: number;
  wom_messages: number;
  avg_risk_a: number;           // rata-rata perceived_risk_a semua agen (0–1)
  avg_parking_aversion: number; // rata-rata parking_aversion semua agen (0–1)
  revenue_a: number;
  revenue_b: number;
}

export interface AgentSnapshot {
  id: number;
  x: number;
  y: number;
  choice: 'A' | 'B' | 'none';
  parking_aversion: number;
  perceived_risk_a: number;    // ganti dari memory_a; nama field sesuai model Python
  had_bad_experience: boolean;
  no_buy_reason: 'no_need' | null;
}

export interface ModelParams {
  weight_distance: number;
  weight_parking_aversion: number;
  weight_parking_fee: number;
  weight_risk: number;
  weight_attractiveness: number;
  parking_fee: number;
  attractiveness_A: number;
  attractiveness_B: number;
  wom_probability: number;
  wom_strength: number;
  memory_strength: number;
  memory_decay: number;
}

export interface SimConfig {
  n_agents: number;
  n_days: number;
  market_radius: number;
  store_a_x: number;
  store_a_y: number;
  store_b_x: number;
  store_b_y: number;
}

export interface SimulateResponse {
  abm_daily: DayData[];
  agent_snapshots: AgentSnapshot[];
  model_params: ModelParams;
  sim_config: SimConfig;
}

export async function runSimulation(params: SimulateRequest): Promise<SimulateResponse> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Simulation failed (${res.status}): ${err}`);
  }
  return res.json();
}
