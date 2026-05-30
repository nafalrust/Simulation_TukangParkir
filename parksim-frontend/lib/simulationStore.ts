import { create } from 'zustand';
import { runSimulation, SimulateRequest, SimulateResponse } from './api';

const DEFAULT_PARAMS: SimulateRequest = {
  n_agents: 200,
  n_days: 60,
  market_radius: 600,
  distance_between_stores: 500,
  parking_intensity: 0.7,
  shopping_prob: 0.35,
  avg_spending: 25000,
  wom_impact: 0.18,
  share_probability: 0.6,
  memory_decay: 0.03,
  direct_experience_impact: 0.35,
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

  runSimulation: () => Promise<void>;
  setFrame: (frame: number) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
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
