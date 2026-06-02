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

  // Pembelian
  min_purchase_amount: number;
  max_purchase_amount: number;

  // Agen
  parking_aversion: number;
  initial_risk_a: number;
  shopping_proba: number;

  // Memori & pengalaman
  memory_decay: number;
  direct_experience_impact: number;
  bad_experience_probability: number;

  // Word of mouth
  wom_probability: number;
  wom_strength: number;
  num_contacts: number;

  // Threshold tallying
  fee_ratio_threshold: number;
  parking_aversion_threshold: number;
  risk_threshold: number;

  seed: number;
}

export interface DayData {
  day: number;
  visits_a: number;
  visits_b: number;
  no_buy: number;
  total_visits: number;
  share_visits_a: number;
  share_visits_b: number;
  bad_experiences: number;
  wom_messages: number;
  avg_risk_a: number;
  avg_parking_aversion: number;
  revenue_a: number;
  revenue_b: number;
  total_revenue: number;
}

export interface AgentSnapshot {
  id: number;
  x: number;
  y: number;
  choice: 'A' | 'B' | 'none';
  parking_aversion: number;
  perceived_risk_a: number;
  had_bad_experience: boolean;
  no_buy_reason: 'no_need' | null;
}

export interface ModelParams {
  market_radius: number;
  distance_to_B: number;
  parking_fee: number;
  fee_ratio_threshold: number;
  parking_aversion_threshold: number;
  risk_threshold: number;
  attractiveness_A: number;
  attractiveness_B: number;
  min_purchase_amount: number;
  max_purchase_amount: number;
  shopping_proba: number;
  parking_aversion: number;
  initial_risk_a: number;
  memory_decay: number;
  direct_experience_impact: number;
  bad_experience_probability: number;
  wom_probability: number;
  wom_strength: number;
  num_contacts: number;
}

export interface SimConfig {
  n_agents: number;
  n_days: number;
  market_radius: number;
  distance_to_B: number;
  agent_distribution: string;
  catchment_center_x: number;
  catchment_center_y: number;
  distance_scale: number;
  store_a_x: number;
  store_a_y: number;
  store_b_x: number;
  store_b_y: number;
}

// Format internal: array sepanjang n_days, tiap elemen adalah
// Record<customer_id_string, "A"|"B">. Agent tidak belanja = tidak muncul (= "stay").
export type AgentChoicesPerDay = Record<string, 'A' | 'B'>[];

export interface WomEvent {
  id: number;
  day: number;
  storyteller_id: number;
  listener_id: number;
  storyteller_x: number;
  storyteller_y: number;
  listener_x: number;
  listener_y: number;
  risk_before: number;
  risk_after: number;
  wom_strength: number;
}

export type WomEventsPerDay = WomEvent[][];

// Format mentah dari backend teman: flat list per record keputusan
interface ChoiceRecord {
  day: number;
  customer_id: number;
  choice: string;
}

// Raw response dari backend (sebelum diproses)
interface RawSimulateResponse {
  abm_daily: DayData[];
  agent_snapshots: AgentSnapshot[];
  choice_records: ChoiceRecord[];
  wom_events: WomEvent[];
  abm_daily_no_jukir: DayData[];
  agent_snapshots_no_jukir: AgentSnapshot[];
  choice_records_no_jukir: ChoiceRecord[];
  wom_events_no_jukir: WomEvent[];
  model_params: ModelParams;
  sim_config: SimConfig;
}

export interface SimulateResponse {
  // Skenario ADA jukir
  abm_daily: DayData[];
  agent_snapshots: AgentSnapshot[];
  agent_choices_per_day: AgentChoicesPerDay;
  wom_events_per_day: WomEventsPerDay;
  // Skenario TANPA jukir (perbandingan)
  abm_daily_no_jukir: DayData[];
  agent_snapshots_no_jukir: AgentSnapshot[];
  agent_choices_per_day_no_jukir: AgentChoicesPerDay;
  wom_events_per_day_no_jukir: WomEventsPerDay;
  model_params: ModelParams;
  sim_config: SimConfig;
}

// Transformasi flat choice_records → AgentChoicesPerDay (format yang dipakai SimulationCanvas)
function buildChoicesPerDay(records: ChoiceRecord[], nDays: number): AgentChoicesPerDay {
  const result: AgentChoicesPerDay = Array.from({ length: nDays }, () => ({}));
  for (const r of records) {
    const idx = r.day - 1; // day adalah 1-indexed
    if (idx >= 0 && idx < nDays && (r.choice === 'A' || r.choice === 'B')) {
      result[idx][String(r.customer_id)] = r.choice as 'A' | 'B';
    }
  }
  return result;
}

function buildWomEventsPerDay(records: WomEvent[], nDays: number): WomEventsPerDay {
  const result: WomEventsPerDay = Array.from({ length: nDays }, () => []);
  for (const r of records) {
    const idx = r.day - 1;
    if (idx >= 0 && idx < nDays) {
      result[idx].push(r);
    }
  }
  return result;
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
  const raw: RawSimulateResponse = await res.json();
  const nDays = raw.abm_daily.length;

  return {
    abm_daily: raw.abm_daily,
    agent_snapshots: raw.agent_snapshots,
    agent_choices_per_day: buildChoicesPerDay(raw.choice_records, nDays),
    wom_events_per_day: buildWomEventsPerDay(raw.wom_events ?? [], nDays),
    abm_daily_no_jukir: raw.abm_daily_no_jukir,
    agent_snapshots_no_jukir: raw.agent_snapshots_no_jukir,
    agent_choices_per_day_no_jukir: buildChoicesPerDay(raw.choice_records_no_jukir, nDays),
    wom_events_per_day_no_jukir: buildWomEventsPerDay(raw.wom_events_no_jukir ?? [], nDays),
    model_params: raw.model_params,
    sim_config: raw.sim_config,
  };
}
