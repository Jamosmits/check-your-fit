import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import { ClothingItem } from '../models/ClothingItem';
import { analyzeWardrobeGaps } from '../services/aiService';
import { getAffiliateLinks } from '../services/affiliateService';

interface ShoppingSuggestion {
  id: string;
  user_id: string;
  household_id: string | null;
  trip_id: string | null;
  name: string;
  category: string | null;
  reason: string | null;
  priority: 'high' | 'medium' | 'low';
  affiliate_links: AffiliateLink[] | null;
  is_dismissed: boolean;
  is_purchased: boolean;
  ai_metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

interface AffiliateLink {
  store: string;
  url: string;
  price: number | null;
  currency: string;
}

/** GET /api/shopping */
export async function getSuggestions(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const includeDismissed = req.query['include_dismissed'] === 'true';
  const householdId = req.user?.householdId ?? null;

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (householdId) {
      conditions.push(`(ss.user_id = $${paramIdx++} OR ss.household_id = $${paramIdx++})`);
      params.push(userId, householdId);
    } else {
      conditions.push(`ss.user_id = $${paramIdx++}`);
      params.push(userId);
    }

    if (!includeDismissed) {
      conditions.push(`ss.is_dismissed = false`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<ShoppingSuggestion>(
      `SELECT ss.* FROM shopping_suggestions ss
       ${whereClause}
       ORDER BY
         CASE ss.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         ss.created_at DESC`,
      params
    );

    res.json({ suggestions: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('[shoppingController.getSuggestions]', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}

/** POST /api/shopping/generate */
export async function generateSuggestions(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const requestedUserId = (req.query['user_id'] as string | undefined) ?? userId;
  const householdId = req.user?.householdId ?? null;

  try {
    // Fetch wardrobe
    const itemsResult = await pool.query<ClothingItem>(
      'SELECT * FROM clothing_items WHERE user_id = $1 AND is_active = true',
      [requestedUserId]
    );

    const items = itemsResult.rows;
    if (items.length < 3) {
      res.status(400).json({ error: 'Need at least 3 wardrobe items to generate suggestions' });
      return;
    }

    const gaps = await analyzeWardrobeGaps(items);

    const created: ShoppingSuggestion[] = [];

    for (const gap of gaps) {
      // Fetch affiliate links for each suggested item
      let affiliateLinks: AffiliateLink[] = [];
      try {
        affiliateLinks = await getAffiliateLinks(gap.name, gap.category ?? '');
      } catch (affiliateErr) {
        console.warn('[shoppingController] Affiliate fetch failed:', affiliateErr);
      }

      const id = uuidv4();
      const result = await pool.query<ShoppingSuggestion>(
        `INSERT INTO shopping_suggestions (
          id, user_id, household_id, name, category, reason, priority, affiliate_links
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          id,
          requestedUserId,
          householdId,
          gap.name,
          gap.category ?? null,
          gap.reason ?? null,
          gap.priority ?? 'medium',
          affiliateLinks.length > 0 ? JSON.stringify(affiliateLinks) : null,
        ]
      );

      if (result.rows[0]) {
        created.push(result.rows[0]);
      }
    }

    res.status(201).json({ suggestions: created, generated_count: created.length });
  } catch (err) {
    console.error('[shoppingController.generateSuggestions]', err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}

/** PATCH /api/shopping/:id/dismiss */
export async function dismissSuggestion(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query<ShoppingSuggestion>(
      `UPDATE shopping_suggestions
       SET is_dismissed = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Suggestion not found or access denied' });
      return;
    }

    res.json({ suggestion: result.rows[0] });
  } catch (err) {
    console.error('[shoppingController.dismissSuggestion]', err);
    res.status(500).json({ error: 'Failed to dismiss suggestion' });
  }
}

/** PATCH /api/shopping/:id/purchased */
export async function markPurchased(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query<ShoppingSuggestion>(
      `UPDATE shopping_suggestions
       SET is_purchased = true, is_dismissed = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Suggestion not found or access denied' });
      return;
    }

    res.json({ suggestion: result.rows[0] });
  } catch (err) {
    console.error('[shoppingController.markPurchased]', err);
    res.status(500).json({ error: 'Failed to mark as purchased' });
  }
}

/** DELETE /api/shopping/:id */
export async function deleteSuggestion(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM shopping_suggestions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Suggestion not found or access denied' });
      return;
    }

    res.json({ message: 'Suggestion deleted' });
  } catch (err) {
    console.error('[shoppingController.deleteSuggestion]', err);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
}
