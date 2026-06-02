import { create } from 'zustand';
import { runSimulation, SimulateRequest, SimulateResponse } from './api';

const DEFAULT_PARAMS: SimulateRequest = {
  n_agents: 200,
  n_days: 60,
  market_radius: 500,
  distance_to_B: 500,
  parking_fee: 2000,
  attractiveness_A: 0.5,
  attractiveness_B: 0.5,
  min_purchase_amount: 5000,
  max_purchase_amount: 200000,
  purchase_amount_distribution: [
    [5_000, 20_000, 0.25],
    [20_000, 50_000, 0.5],
    [50_000, 200_000, 0.25],
  ],
  parking_aversion: 0.5,
  initial_risk_a: 0.0,
  shopping_proba: 0.5,
  memory_decay: 0.05,
  direct_experience_impact: 0.35,
  bad_experience_probability: 0.5,
  wom_probability: 0.6,
  wom_strength: 0.08,
  num_contacts: 4,
  fee_ratio_threshold: 0.1,
  parking_aversion_threshold: 0.5,
  risk_threshold: 0.5,
  seed: 42,
};

interface SimulationStore {
  params: SimulateRequest;
  setParam: (key: keyof SimulateRequest, value: number) => void;
  resetParams: () => void;

  data: SimulateResponse | null;
  isLoading: boolean;
  error: string | null;

  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;
  animationSpeed: number;
  showNoJukir: boolean;       // true = tampilkan skenario tanpa jukir di 3D
  toggleJukirMode: () => void;

  runSimulation: () => Promise<void>;
  setFrame: (frame: number) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setAnimationSpeed: (speed: number) => void;
  reset: () => void;
  advanceFrame: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),
  resetParams: () => set({ params: { ...DEFAULT_PARAMS } }),

  data: null,
  isLoading: false,
  error: null,

  currentFrame: 0,
  isPlaying: false,
  playbackSpeed: 1,
  animationSpeed: 0.3,
  showNoJukir: false,
  toggleJukirMode: () => set((s) => ({ showNoJukir: !s.showNoJukir })),

  runSimulation: async () => {
    set({ isLoading: true, error: null, isPlaying: false, currentFrame: 0 });
    try {
      const data = await runSimulation(get().params);
      set({ data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  setFrame: (frame) => set({ currentFrame: frame, isPlaying: false }),

  togglePlay: () => {
    const { isPlaying, currentFrame, data } = get();
    if (!data) return;
    const nDays = data.abm_daily.length;
    if (!isPlaying && currentFrame >= nDays - 1) {
      set({ currentFrame: 0, isPlaying: true });
    } else {
      set({ isPlaying: !isPlaying });
    }
  },

  setSpeed: (speed) => set({ playbackSpeed: speed }),
  setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

  reset: () => set({ currentFrame: 0, isPlaying: false }),

  advanceFrame: () => {
    const { currentFrame, data, isPlaying } = get();
    if (!data || !isPlaying) return;
    const nDays = data.abm_daily.length;
    if (currentFrame >= nDays - 1) {
      set({ isPlaying: false });
    } else {
      set({ currentFrame: currentFrame + 1 });
    }
  },
}));
