import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import {
  Household,
  HouseholdWithMembers,
  HouseholdMember,
  CreateHouseholdInput,
  JoinHouseholdInput,
} from '../models/Household';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** POST /api/household */
export async function createHousehold(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { name } = req.body as CreateHouseholdInput;
  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: 'Household name is required' });
    return;
  }

  // Check if user already belongs to a household
  const userCheck = await pool.query<{ household_id: string | null }>(
    'SELECT household_id FROM users WHERE id = $1',
    [userId]
  );
  if (userCheck.rows[0]?.household_id) {
    res.status(409).json({ error: 'You already belong to a household. Leave it first.' });
    return;
  }

  try {
    let inviteCode = generateInviteCode();
    // Ensure uniqueness
    let codeExists = true;
    while (codeExists) {
      const check = await pool.query<{ id: string }>(
        'SELECT id FROM households WHERE invite_code = $1',
        [inviteCode]
      );
      if ((check.rowCount ?? 0) === 0) {
        codeExists = false;
      } else {
        inviteCode = generateInviteCode();
      }
    }

    const householdId = uuidv4();

    const result = await pool.query<Household>(
      `INSERT INTO households (id, name, invite_code) VALUES ($1, $2, $3) RETURNING *`,
      [householdId, name.trim(), inviteCode]
    );

    // Assign user to household as owner
    await pool.query(
      `UPDATE users SET household_id = $1, role = 'owner', updated_at = NOW() WHERE id = $2`,
      [householdId, userId]
    );

    res.status(201).json({ household: result.rows[0] });
  } catch (err) {
    console.error('[householdController.createHousehold]', err);
    res.status(500).json({ error: 'Failed to create household' });
  }
}

/** POST /api/household/join */
export async function joinHousehold(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { invite_code } = req.body as JoinHouseholdInput;
  if (!invite_code) {
    res.status(400).json({ error: 'invite_code is required' });
    return;
  }

  try {
    // Check if user already in a household
    const userCheck = await pool.query<{ household_id: string | null }>(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );
    if (userCheck.rows[0]?.household_id) {
      res.status(409).json({ error: 'You already belong to a household. Leave it first.' });
      return;
    }

    const householdResult = await pool.query<Household>(
      'SELECT * FROM households WHERE invite_code = $1',
      [invite_code.toUpperCase().trim()]
    );

    const household = householdResult.rows[0];
    if (!household) {
      res.status(404).json({ error: 'Invalid invite code' });
      return;
    }

    await pool.query(
      `UPDATE users SET household_id = $1, role = 'member', updated_at = NOW() WHERE id = $2`,
      [household.id, userId]
    );

    res.json({ household });
  } catch (err) {
    console.error('[householdController.joinHousehold]', err);
    res.status(500).json({ error: 'Failed to join household' });
  }
}

/** GET /api/household */
export async function getHousehold(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const userResult = await pool.query<{ household_id: string | null }>(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );

    const householdId = userResult.rows[0]?.household_id;
    if (!householdId) {
      res.status(404).json({ error: 'You are not in a household' });
      return;
    }

    const result = await pool.query<Household>(
      'SELECT * FROM households WHERE id = $1',
      [householdId]
    );

    const household = result.rows[0];
    if (!household) {
      res.status(404).json({ error: 'Household not found' });
      return;
    }

    const membersResult = await pool.query<HouseholdMember>(
      `SELECT id, display_name, email, avatar_url, role, created_at
       FROM users WHERE household_id = $1 ORDER BY created_at ASC`,
      [householdId]
    );

    const withMembers: HouseholdWithMembers = {
      ...household,
      members: membersResult.rows,
    };

    res.json({ household: withMembers });
  } catch (err) {
    console.error('[householdController.getHousehold]', err);
    res.status(500).json({ error: 'Failed to fetch household' });
  }
}

/** GET /api/household/members */
export async function getMembers(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const userResult = await pool.query<{ household_id: string | null }>(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );

    const householdId = userResult.rows[0]?.household_id;
    if (!householdId) {
      res.status(404).json({ error: 'You are not in a household' });
      return;
    }

    const result = await pool.query<HouseholdMember>(
      `SELECT id, display_name, email, avatar_url, role, created_at
       FROM users WHERE household_id = $1 ORDER BY role DESC, created_at ASC`,
      [householdId]
    );

    res.json({ members: result.rows });
  } catch (err) {
    console.error('[householdController.getMembers]', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

/** DELETE /api/household/leave */
export async function leaveHousehold(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const userResult = await pool.query<{ household_id: string | null; role: string }>(
      'SELECT household_id, role FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    if (!user?.household_id) {
      res.status(400).json({ error: 'You are not in a household' });
      return;
    }

    if (user.role === 'owner') {
      // Check if there are other members
      const memberCount = await pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM users WHERE household_id = $1',
        [user.household_id]
      );
      const count = parseInt(memberCount.rows[0]?.count ?? '0', 10);
      if (count > 1) {
        res.status(409).json({
          error: 'Owner cannot leave while other members are present. Transfer ownership first.',
        });
        return;
      }
    }

    await pool.query(
      `UPDATE users SET household_id = NULL, role = 'member', updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    res.json({ message: 'Left household successfully' });
  } catch (err) {
    console.error('[householdController.leaveHousehold]', err);
    res.status(500).json({ error: 'Failed to leave household' });
  }
}
