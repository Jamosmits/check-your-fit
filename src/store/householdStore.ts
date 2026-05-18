import { create } from 'zustand';

export interface HouseholdMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
}

interface HouseholdState {
  household: Household | null;
  members: HouseholdMember[];
  activeMemberId: string | null;
  setHousehold: (household: Household | null) => void;
  setMembers: (members: HouseholdMember[]) => void;
  setActiveMember: (memberId: string | null) => void;
  addMember: (member: HouseholdMember) => void;
  removeMember: (userId: string) => void;
}

export const useHouseholdStore = create<HouseholdState>((set) => ({
  household: null,
  members: [],
  activeMemberId: null,

  setHousehold: (household) => set({ household }),

  setMembers: (members) => set({ members }),

  setActiveMember: (memberId) => set({ activeMemberId: memberId }),

  addMember: (member) =>
    set((state) => ({ members: [...state.members, member] })),

  removeMember: (userId) =>
    set((state) => ({
      members: state.members.filter((m) => m.userId !== userId),
    })),
}));
