export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: Date;
  updated_at: Date;
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];
}

export interface HouseholdMember {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: 'owner' | 'member';
  created_at: Date;
}

export interface CreateHouseholdInput {
  name: string;
}

export interface JoinHouseholdInput {
  invite_code: string;
}
