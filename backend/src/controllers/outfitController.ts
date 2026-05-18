import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import { Outfit, CreateOutfitInput, UpdateOutfitInput, OutfitSuggestionContext, OutfitSuggestion } from '../models/Outfit';
import { ClothingItem } from '../models/ClothingItem';
import { generateOutfitSuggestions } from '../services/aiService';

/** GET /api/outfits */
export async function getOutfits(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const householdId = req.user?.householdId ?? null;
  const requestedUserId = req.query['user_id'] as string | undefined;
  const occasion = req.query['occasion'] as string | undefined;
  const season = req.query['season'] as string | undefined;

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (requestedUserId) {
      conditions.push(`o.user_id = $${paramIdx++}`);
      params.push(requestedUserId);
    } else if (householdId) {
      conditions.push(`o.household_id = $${paramIdx++}`);
      params.push(householdId);
    } else {
      conditions.push(`o.user_id = $${paramIdx++}`);
      params.push(userId);
    }

    if (occasion) {
      conditions.push(`o.occasion = $${paramIdx++}`);
      params.push(occasion);
    }

    if (season) {
      conditions.push(`$${paramIdx++} = ANY(o.season)`);
      params.push(season);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<Outfit>(
      `SELECT o.* FROM outfits o ${whereClause} ORDER BY o.created_at DESC`,
      params
    );

    res.json({ outfits: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('[outfitController.getOutfits]', err);
    res.status(500).json({ error: 'Failed to fetch outfits' });
  }
}

/** GET /api/outfits/:id */
export async function getOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query<Outfit>(
      `SELECT o.* FROM outfits o
       WHERE o.id = $1 AND (o.user_id = $2 OR o.household_id = $3)`,
      [id, userId, req.user?.householdId ?? null]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Outfit not found' });
      return;
    }

    res.json({ outfit: result.rows[0] });
  } catch (err) {
    console.error('[outfitController.getOutfit]', err);
    res.status(500).json({ error: 'Failed to fetch outfit' });
  }
}

/** POST /api/outfits */
export async function createOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const input = req.body as CreateOutfitInput;

  if (!input.name || !Array.isArray(input.item_ids) || input.item_ids.length === 0) {
    res.status(400).json({ error: 'name and item_ids are required' });
    return;
  }

  try {
    const id = uuidv4();
    const householdId = req.user?.householdId ?? null;

    const result = await pool.query<Outfit>(
      `INSERT INTO outfits (
        id, user_id, household_id, name, description, item_ids,
        occasion, season, weather_min, weather_max, formality,
        tags, image_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13
      ) RETURNING *`,
      [
        id, userId, householdId,
        input.name.trim(),
        input.description ?? null,
        `{${input.item_ids.join(',')}}`,
        input.occasion ?? null,
        input.season ? `{${input.season.join(',')}}` : null,
        input.weather_min ?? null,
        input.weather_max ?? null,
        input.formality ?? null,
        input.tags ? `{${input.tags.join(',')}}` : null,
        input.image_url ?? null,
      ]
    );

    res.status(201).json({ outfit: result.rows[0] });
  } catch (err) {
    console.error('[outfitController.createOutfit]', err);
    res.status(500).json({ error: 'Failed to create outfit' });
  }
}

/** PUT /api/outfits/:id */
export async function updateOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const input = req.body as UpdateOutfitInput;

  try {
    const ownership = await pool.query<{ id: string }>(
      'SELECT id FROM outfits WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if ((ownership.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Outfit not found or access denied' });
      return;
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    const fieldMap: Record<string, unknown> = {
      name: input.name?.trim(),
      description: input.description,
      item_ids: input.item_ids ? `{${input.item_ids.join(',')}}` : undefined,
      occasion: input.occasion,
      season: input.season ? `{${input.season.join(',')}}` : undefined,
      weather_min: input.weather_min,
      weather_max: input.weather_max,
      formality: input.formality,
      tags: input.tags ? `{${input.tags.join(',')}}` : undefined,
      image_url: input.image_url,
    };

    for (const [field, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        setClauses.push(`${field} = $${paramIdx++}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    params.push(id);
    const result = await pool.query<Outfit>(
      `UPDATE outfits SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIdx}
       RETURNING *`,
      params
    );

    res.json({ outfit: result.rows[0] });
  } catch (err) {
    console.error('[outfitController.updateOutfit]', err);
    res.status(500).json({ error: 'Failed to update outfit' });
  }
}

/** DELETE /api/outfits/:id */
export async function deleteOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM outfits WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Outfit not found or access denied' });
      return;
    }

    res.json({ message: 'Outfit deleted successfully' });
  } catch (err) {
    console.error('[outfitController.deleteOutfit]', err);
    res.status(500).json({ error: 'Failed to delete outfit' });
  }
}

/** POST /api/outfits/:id/worn */
export async function markOutfitWorn(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query<Outfit>(
      `UPDATE outfits
       SET wear_count = wear_count + 1, last_worn_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Outfit not found or access denied' });
      return;
    }

    // Also increment wear_count on each clothing item in the outfit
    const outfit = result.rows[0];
    if (outfit.item_ids && outfit.item_ids.length > 0) {
      await pool.query(
        `UPDATE clothing_items
         SET wear_count = wear_count + 1, last_worn_at = NOW(), updated_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [outfit.item_ids]
      );
    }

    res.json({ outfit: result.rows[0] });
  } catch (err) {
    console.error('[outfitController.markOutfitWorn]', err);
    res.status(500).json({ error: 'Failed to mark outfit as worn' });
  }
}

/** POST /api/outfits/suggest */
export async function getAISuggestions(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const context = req.body as OutfitSuggestionContext;
  const requestedUserId = (req.query['user_id'] as string | undefined) ?? userId;

  try {
    // Fetch wardrobe items for the requested user
    const itemsResult = await pool.query<ClothingItem>(
      `SELECT * FROM clothing_items
       WHERE user_id = $1 AND is_active = true
       ORDER BY wear_count ASC, created_at DESC`,
      [requestedUserId]
    );

    const items = itemsResult.rows;
    if (items.length === 0) {
      res.status(400).json({ error: 'No wardrobe items found to generate suggestions' });
      return;
    }

    const suggestions: OutfitSuggestion[] = await generateOutfitSuggestions(items, context);

    res.json({ suggestions });
  } catch (err) {
    console.error('[outfitController.getAISuggestions]', err);
    res.status(500).json({ error: 'Failed to generate outfit suggestions' });
  }
}
