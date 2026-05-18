import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import {
  ClothingItem,
  CreateClothingItemInput,
  UpdateClothingItemInput,
  ClothingItemFilter,
} from '../models/ClothingItem';
import { processAndUploadImage } from '../services/imageService';

/** GET /api/wardrobe */
export async function getItems(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const filter: ClothingItemFilter = {
    category: req.query['category'] as ClothingItemFilter['category'],
    season: req.query['season'] as ClothingItemFilter['season'],
    formality: req.query['formality'] as ClothingItemFilter['formality'],
    color: req.query['color'] as string | undefined,
    search: req.query['search'] as string | undefined,
    is_active: req.query['is_active'] !== 'false',
    user_id: req.query['user_id'] as string | undefined,
  };

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Scope to household or current user
    const householdId = req.user?.householdId;
    if (filter.user_id) {
      conditions.push(`ci.user_id = $${paramIdx++}`);
      params.push(filter.user_id);
    } else if (householdId) {
      conditions.push(`ci.household_id = $${paramIdx++}`);
      params.push(householdId);
    } else {
      conditions.push(`ci.user_id = $${paramIdx++}`);
      params.push(userId);
    }

    if (filter.is_active !== undefined) {
      conditions.push(`ci.is_active = $${paramIdx++}`);
      params.push(filter.is_active);
    }

    if (filter.category) {
      conditions.push(`ci.category = $${paramIdx++}`);
      params.push(filter.category);
    }

    if (filter.season) {
      conditions.push(`$${paramIdx++} = ANY(ci.season)`);
      params.push(filter.season);
    }

    if (filter.formality) {
      conditions.push(`ci.formality = $${paramIdx++}`);
      params.push(filter.formality);
    }

    if (filter.color) {
      conditions.push(`ci.color ILIKE $${paramIdx++}`);
      params.push(`%${filter.color}%`);
    }

    if (filter.search) {
      conditions.push(
        `(ci.name ILIKE $${paramIdx} OR ci.brand ILIKE $${paramIdx} OR ci.notes ILIKE $${paramIdx})`
      );
      params.push(`%${filter.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT ci.*, u.display_name AS owner_name
      FROM clothing_items ci
      JOIN users u ON u.id = ci.user_id
      ${whereClause}
      ORDER BY ci.created_at DESC
    `;

    const result = await pool.query<ClothingItem & { owner_name: string }>(query, params);
    res.json({ items: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('[wardrobeController.getItems]', err);
    res.status(500).json({ error: 'Failed to fetch wardrobe items' });
  }
}

/** GET /api/wardrobe/:id */
export async function getItem(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query<ClothingItem>(
      `SELECT ci.* FROM clothing_items ci
       WHERE ci.id = $1
         AND (ci.user_id = $2 OR ci.household_id = $3)`,
      [id, userId, req.user?.householdId ?? null]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('[wardrobeController.getItem]', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
}

/** POST /api/wardrobe */
export async function createItem(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const input = req.body as CreateClothingItemInput;

  if (!input.name || !input.category) {
    res.status(400).json({ error: 'name and category are required' });
    return;
  }

  try {
    let imageUrl = input.image_url ?? null;
    let thumbnailUrl = input.thumbnail_url ?? null;

    // Process uploaded file if present
    if (req.file) {
      const processed = await processAndUploadImage(req.file.path, userId);
      imageUrl = processed.imageUrl;
      thumbnailUrl = processed.thumbnailUrl;
    }

    const id = uuidv4();
    const householdId = req.user?.householdId ?? null;

    const result = await pool.query<ClothingItem>(
      `INSERT INTO clothing_items (
        id, user_id, household_id, name, category, subcategory,
        color, colors, brand, size, material, pattern, formality,
        season, tags, image_url, thumbnail_url, original_image_url,
        purchase_date, purchase_price, notes, ai_metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22
      ) RETURNING *`,
      [
        id, userId, householdId,
        input.name.trim(), input.category,
        input.subcategory ?? null,
        input.color ?? null,
        input.colors ? `{${input.colors.join(',')}}` : null,
        input.brand ?? null,
        input.size ?? null,
        input.material ?? null,
        input.pattern ?? null,
        input.formality ?? null,
        input.season ? `{${input.season.join(',')}}` : null,
        input.tags ? `{${input.tags.join(',')}}` : null,
        imageUrl,
        thumbnailUrl,
        input.original_image_url ?? null,
        input.purchase_date ?? null,
        input.purchase_price ?? null,
        input.notes ?? null,
        input.ai_metadata ? JSON.stringify(input.ai_metadata) : null,
      ]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error('[wardrobeController.createItem]', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
}

/** PUT /api/wardrobe/:id */
export async function updateItem(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const input = req.body as UpdateClothingItemInput;

  try {
    // Verify ownership
    const ownership = await pool.query<{ id: string }>(
      'SELECT id FROM clothing_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if ((ownership.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Item not found or access denied' });
      return;
    }

    let imageUrl = input.image_url;
    let thumbnailUrl = input.thumbnail_url;

    if (req.file) {
      const processed = await processAndUploadImage(req.file.path, userId);
      imageUrl = processed.imageUrl;
      thumbnailUrl = processed.thumbnailUrl;
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    const fieldMap: Record<string, unknown> = {
      name: input.name?.trim(),
      category: input.category,
      subcategory: input.subcategory,
      color: input.color,
      colors: input.colors ? `{${input.colors.join(',')}}` : undefined,
      brand: input.brand,
      size: input.size,
      material: input.material,
      pattern: input.pattern,
      formality: input.formality,
      season: input.season ? `{${input.season.join(',')}}` : undefined,
      tags: input.tags ? `{${input.tags.join(',')}}` : undefined,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      purchase_date: input.purchase_date,
      purchase_price: input.purchase_price,
      notes: input.notes,
      is_active: input.is_active,
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
    const result = await pool.query<ClothingItem>(
      `UPDATE clothing_items SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIdx}
       RETURNING *`,
      params
    );

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('[wardrobeController.updateItem]', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
}

/** DELETE /api/wardrobe/:id */
export async function deleteItem(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM clothing_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Item not found or access denied' });
      return;
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('[wardrobeController.deleteItem]', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
}

/** POST /api/wardrobe/:id/worn */
export async function markWorn(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;

  try {
    const result = await pool.query<ClothingItem>(
      `UPDATE clothing_items
       SET wear_count = wear_count + 1,
           last_worn_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Item not found or access denied' });
      return;
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('[wardrobeController.markWorn]', err);
    res.status(500).json({ error: 'Failed to mark item as worn' });
  }
}
