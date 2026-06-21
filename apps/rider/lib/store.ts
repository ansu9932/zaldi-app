/**
 * Rider job state (Zustand). DEMO data; live Supabase realtime added in Stage 8.
 */
import { create } from 'zustand';

export type JobStage = 'offered' | 'to_shop' | 'picked_up' | 'delivered';

export interface Job {
  id: string;
  code: string;
  shop: string;
  shopAddress: string;
  shopLat: number;
  shopLng: number;
  customer: string;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  distanceKm: number;
  payout: number;
  items: number;
  stage: JobStage;
}

const seed: Job[] = [
  {
    id: 'j1', code: '#NX1039', shop: 'Kanthi Fresh Mart', shopAddress: 'Central Market, Contai',
    shopLat: 21.779, shopLng: 87.752, customer: 'Sk. Imran', dropAddress: 'Hugli, Contai',
    dropLat: 21.79, dropLng: 87.76, distanceKm: 2.4, payout: 32, items: 2, stage: 'offered',
  },
  {
    id: 'j2', code: '#NX1041', shop: 'Snack Junction', shopAddress: 'Station Road, Contai',
    shopLat: 21.7802, shopLng: 87.754, customer: 'Ananya P.', dropAddress: 'Darua, Contai',
    dropLat: 21.77, dropLng: 87.745, distanceKm: 1.6, payout: 28, items: 4, stage: 'offered',
  },
];

interface RiderState {
  online: boolean;
  earningsToday: number;
  deliveriesToday: number;
  toggleOnline: () => void;
  jobs: Job[];
  current: Job | null;
  acceptJob: (id: string) => void;
  declineJob: (id: string) => void;
  advance: () => void; // to_shop -> picked_up -> delivered
}

export const useRider = create<RiderState>((set, get) => ({
  online: true,
  earningsToday: 214,
  deliveriesToday: 7,
  toggleOnline: () => set((s) => ({ online: !s.online })),
  jobs: seed,
  current: null,
  acceptJob: (id) =>
    set((s) => {
      const job = s.jobs.find((j) => j.id === id);
      if (!job) return s;
      return {
        current: { ...job, stage: 'to_shop' },
        jobs: s.jobs.filter((j) => j.id !== id),
      };
    }),
  declineJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
  advance: () =>
    set((s) => {
      if (!s.current) return s;
      if (s.current.stage === 'to_shop') return { current: { ...s.current, stage: 'picked_up' } };
      if (s.current.stage === 'picked_up') {
        return {
          current: null,
          earningsToday: s.earningsToday + s.current.payout,
          deliveriesToday: s.deliveriesToday + 1,
        };
      }
      return s;
    }),
}));
