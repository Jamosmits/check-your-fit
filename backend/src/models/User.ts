export interface User {
  id: string;
  household_id: string | null;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  role: 'owner' | 'member';
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  household_id: string | null;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: 'owner' | 'member';
  created_at: Date;
}

export interface RegisterInput {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  householdId: string | null;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}
