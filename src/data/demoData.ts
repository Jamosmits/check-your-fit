import { ClothingItem } from '@/store/wardrobeStore';
import { Outfit } from '@/store/outfitStore';
import { Household, HouseholdMember } from '@/store/householdStore';
import { User } from '@/store/authStore';

export const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Demo Gebruiker',
  email: 'demo@checkyourfit.app',
  avatarUrl: 'https://i.pravatar.cc/150?u=demo',
};

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

// Wardrobe starts empty — items are added by scanning
export const DEMO_ITEMS: ClothingItem[] = [];
export const DEMO_OUTFITS: Outfit[] = [];

export const DEMO_HOUSEHOLD: Household = {
  id: 'demo-household',
  name: 'Demo Huishouden',
  ownerId: 'demo-user',
  inviteCode: 'DEMO123',
  createdAt: daysAgo(200),
};

export const DEMO_MEMBERS: HouseholdMember[] = [
  {
    id: 'demo-member-1',
    userId: 'demo-user',
    name: 'Demo Gebruiker',
    email: 'demo@checkyourfit.app',
    avatarUrl: 'https://i.pravatar.cc/150?u=demo',
    role: 'owner',
    joinedAt: daysAgo(200),
  },
  {
    id: 'demo-member-2',
    userId: 'demo-partner',
    name: 'Sarah',
    email: 'sarah@checkyourfit.app',
    avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
    role: 'member',
    joinedAt: daysAgo(100),
  },
];
