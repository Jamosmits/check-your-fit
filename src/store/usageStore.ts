import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type PlanType    = 'free' | 'starter' | 'premium' | 'pro';
export type UsageType   = 'scan' | 'hdPhoto' | 'tryOn';

export interface PlanInfo {
  label:   string;
  price:   number;
  scans:   number;
  hdPhotos: number;
  tryOns:  number;
}

export const PLANS: Record<PlanType, PlanInfo> = {
  free:    { label: 'Gratis',  price: 0,     scans: 999, hdPhotos: 999, tryOns: 999  },
  starter: { label: 'Starter', price: 6.99,  scans: 100, hdPhotos: 50,  tryOns: 20  },
  premium: { label: 'Premium', price: 12.99, scans: 250, hdPhotos: 150, tryOns: 60  },
  pro:     { label: 'Pro',     price: 24.99, scans: 500, hdPhotos: 400, tryOns: 150 },
};

export class LimitReachedError extends Error {
  constructor(public readonly usageType: UsageType, public readonly plan: PlanType) {
    const limits = PLANS[plan];
    const label  = usageType === 'scan' ? 'scans' : usageType === 'hdPhoto' ? 'HD foto\'s' : 'try-ons';
    const limit  = usageType === 'scan' ? limits.scans : usageType === 'hdPhoto' ? limits.hdPhotos : limits.tryOns;
    super(`Je ${PLANS[plan].label}-limiet voor ${label} (${limit}) is bereikt. Upgrade voor meer.`);
    this.name = 'LimitReachedError';
  }
}

interface UsageState {
  currentPlan:    PlanType;
  scansUsed:      number;
  hdPhotosUsed:   number;
  tryOnsUsed:     number;
  lastResetDate:  string;   // ISO date string YYYY-MM-DD

  setPlan:         (plan: PlanType) => Promise<void>;
  checkLimit:      (type: UsageType) => void;  // throws LimitReachedError if over
  increment:       (type: UsageType) => Promise<void>;
  resetUsage:      () => Promise<void>;
  resetIfNewMonth: () => Promise<void>;
  loadUsage:       () => Promise<void>;
}

const USAGE_KEY = 'usage_state_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isNewMonth(lastReset: string): boolean {
  const now  = new Date();
  const last = new Date(lastReset);
  return now.getFullYear() !== last.getFullYear() || now.getMonth() !== last.getMonth();
}

async function persist(state: Pick<UsageState, 'currentPlan' | 'scansUsed' | 'hdPhotosUsed' | 'tryOnsUsed' | 'lastResetDate'>) {
  await SecureStore.setItemAsync(USAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export const useUsageStore = create<UsageState>((set, get) => ({
  currentPlan:   'free',
  scansUsed:     0,
  hdPhotosUsed:  0,
  tryOnsUsed:    0,
  lastResetDate: todayStr(),

  setPlan: async (plan) => {
    const next = { ...get(), currentPlan: plan };
    set({ currentPlan: plan });
    await persist(next);
  },

  checkLimit: (type) => {
    const { currentPlan, scansUsed, hdPhotosUsed, tryOnsUsed } = get();
    const limits = PLANS[currentPlan];
    if (type === 'scan'    && scansUsed    >= limits.scans)    throw new LimitReachedError(type, currentPlan);
    if (type === 'hdPhoto' && hdPhotosUsed >= limits.hdPhotos) throw new LimitReachedError(type, currentPlan);
    if (type === 'tryOn'   && tryOnsUsed   >= limits.tryOns)   throw new LimitReachedError(type, currentPlan);
  },

  increment: async (type) => {
    const s = get();
    const next = {
      currentPlan:   s.currentPlan,
      lastResetDate: s.lastResetDate,
      scansUsed:     s.scansUsed     + (type === 'scan'    ? 1 : 0),
      hdPhotosUsed:  s.hdPhotosUsed  + (type === 'hdPhoto' ? 1 : 0),
      tryOnsUsed:    s.tryOnsUsed    + (type === 'tryOn'   ? 1 : 0),
    };
    set(next);
    await persist(next);
  },

  resetUsage: async () => {
    const next = { ...get(), scansUsed: 0, hdPhotosUsed: 0, tryOnsUsed: 0, lastResetDate: todayStr() };
    set(next);
    await persist(next);
  },

  resetIfNewMonth: async () => {
    const { lastResetDate } = get();
    if (isNewMonth(lastResetDate)) {
      const next = { ...get(), scansUsed: 0, hdPhotosUsed: 0, tryOnsUsed: 0, lastResetDate: todayStr() };
      set(next);
      await persist(next);
    }
  },

  loadUsage: async () => {
    const raw = await SecureStore.getItemAsync(USAGE_KEY).catch(() => null);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<UsageState>;
      const lastReset = saved.lastResetDate ?? todayStr();
      if (isNewMonth(lastReset)) {
        set({ currentPlan: saved.currentPlan ?? 'free', scansUsed: 0, hdPhotosUsed: 0, tryOnsUsed: 0, lastResetDate: todayStr() });
      } else {
        set({
          currentPlan:   saved.currentPlan   ?? 'free',
          scansUsed:     saved.scansUsed     ?? 0,
          hdPhotosUsed:  saved.hdPhotosUsed  ?? 0,
          tryOnsUsed:    saved.tryOnsUsed    ?? 0,
          lastResetDate: lastReset,
        });
      }
    } catch {}
  },
}));
