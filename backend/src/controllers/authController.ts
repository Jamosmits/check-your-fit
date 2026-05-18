import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import {
  RegisterInput,
  LoginInput,
  PublicUser,
  JwtPayload,
  AuthResponse,
} from '../models/User';

const SALT_ROUNDS = 12;

function signToken(payload: JwtPayload): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const expiresIn = process.env['JWT_EXPIRES_IN'] ?? '30d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

function toPublicUser(row: {
  id: string;
  household_id: string | null;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: 'owner' | 'member';
  created_at: Date;
}): PublicUser {
  return {
    id: row.id,
    household_id: row.household_id,
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    role: row.role,
    created_at: row.created_at,
  };
}

/** POST /api/auth/register */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, display_name } = req.body as RegisterInput;

  if (!email || !password || !display_name) {
    res.status(400).json({ error: 'email, password and display_name are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  try {
    // Check duplicate email
    const existing = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if ((existing.rowCount ?? 0) > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    const result = await pool.query<{
      id: string;
      household_id: string | null;
      email: string;
      display_name: string;
      avatar_url: string | null;
      role: 'owner' | 'member';
      created_at: Date;
    }>(
      `INSERT INTO users (id, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, household_id, email, display_name, avatar_url, role, created_at`,
      [id, email.toLowerCase().trim(), password_hash, display_name.trim()]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(500).json({ error: 'Failed to create user' });
      return;
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      householdId: user.household_id,
    };

    const token = signToken(payload);
    const response: AuthResponse = { token, user: toPublicUser(user) };

    res.status(201).json(response);
  } catch (err) {
    console.error('[authController.register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const result = await pool.query<{
      id: string;
      household_id: string | null;
      email: string;
      password_hash: string;
      display_name: string;
      avatar_url: string | null;
      role: 'owner' | 'member';
      created_at: Date;
    }>(
      `SELECT id, household_id, email, password_hash, display_name, avatar_url, role, created_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      householdId: user.household_id,
    };

    const token = signToken(payload);
    const response: AuthResponse = { token, user: toPublicUser(user) };

    res.json(response);
  } catch (err) {
    console.error('[authController.login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

/** GET /api/auth/me */
export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pool.query<{
      id: string;
      household_id: string | null;
      email: string;
      display_name: string;
      avatar_url: string | null;
      role: 'owner' | 'member';
      created_at: Date;
    }>(
      `SELECT id, household_id, email, display_name, avatar_url, role, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error('[authController.getMe]', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
