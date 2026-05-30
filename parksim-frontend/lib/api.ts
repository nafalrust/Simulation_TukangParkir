const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface SimulateRequest {
  n_agents: number;
  n_days: number;
  market_radius: number;
  distance_between_stores: number;
  parking_intensity: number;
  shopping_prob: number;
  avg_spending: number;
  wom_impact: number;
  share_probability: number;
  memory_decay: number;
  direct_experience_impact: number;
  seed: number;
}

export interface DayData {
  day: number;
  visits_a: number;
  visits_b: number;
  no_buy: number;
  bad_experiences: number;
  wom_messages: number;
  avg_memory_a: number;
  revenue_a: number;
  revenue_b: number;
}

export interface AgentSnapshot {
  id: number;
  x: number;
  y: number;
  choice: 'A' | 'B' | 'none';
  parking_aversion: number;
  memory_a: number;
  had_bad_experience: boolean;
  no_buy_reason: 'parking_aversion' | 'no_need' | null;
}

export interface DCMResults {
  beta_jarak: number;
  beta_parkir: number;
  n_respondents: number;
  log_likelihood: number;
  pseudo_r2: number;
  p_value_jarak: number;
  p_value_parkir: number;
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
  dcm_results: DCMResults;
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
