import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays } from 'date-fns';
import pool from '../db/pool';
import {
  Trip,
  CreateTripInput,
  UpdateTripInput,
  UpdatePacklistInput,
  PacklistByUser,
} from '../models/Trip';
import { ClothingItem } from '../models/ClothingItem';
import { generateTripPacklist } from '../services/aiService';
import { getWeatherForecast } from '../services/weatherService';

/** GET /api/trips */
export async function getTrips(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const householdId = req.user?.householdId ?? null;
  if (!householdId) {
    res.status(400).json({ error: 'You must be in a household to manage trips' });
    return;
  }

  try {
    const result = await pool.query<Trip>(
      `SELECT * FROM trips WHERE household_id = $1 ORDER BY start_date ASC`,
      [householdId]
    );
    res.json({ trips: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('[tripController.getTrips]', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
}

/** GET /api/trips/:id */
export async function getTrip(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const householdId = req.user?.householdId ?? null;

  try {
    const result = await pool.query<Trip>(
      `SELECT * FROM trips WHERE id = $1 AND household_id = $2`,
      [id, householdId]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    res.json({ trip: result.rows[0] });
  } catch (err) {
    console.error('[tripController.getTrip]', err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
}

/** POST /api/trips */
export async function createTrip(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const householdId = req.user?.householdId ?? null;
  if (!householdId) {
    res.status(400).json({ error: 'You must be in a household to create trips' });
    return;
  }

  const input = req.body as CreateTripInput;

  if (!input.name || !input.destination || !input.start_date || !input.end_date) {
    res.status(400).json({ error: 'name, destination, start_date, and end_date are required' });
    return;
  }

  if (!Array.isArray(input.traveler_ids) || input.traveler_ids.length === 0) {
    res.status(400).json({ error: 'At least one traveler_id is required' });
    return;
  }

  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ error: 'Invalid date format' });
    return;
  }
  if (endDate < startDate) {
    res.status(400).json({ error: 'end_date must be after start_date' });
    return;
  }

  try {
    const id = uuidv4();
    const result = await pool.query<Trip>(
      `INSERT INTO trips (
        id, household_id, created_by, name, destination,
        start_date, end_date, activities, traveler_ids, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, householdId, userId,
        input.name.trim(), input.destination.trim(),
        input.start_date, input.end_date,
        input.activities ? `{${input.activities.join(',')}}` : null,
        `{${input.traveler_ids.join(',')}}`,
        input.notes ?? null,
      ]
    );

    res.status(201).json({ trip: result.rows[0] });
  } catch (err) {
    console.error('[tripController.createTrip]', err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
}

/** PUT /api/trips/:id */
export async function updateTrip(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const householdId = req.user?.householdId ?? null;
  const input = req.body as UpdateTripInput;

  try {
    const ownership = await pool.query<{ id: string }>(
      'SELECT id FROM trips WHERE id = $1 AND household_id = $2',
      [id, householdId]
    );
    if ((ownership.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Trip not found or access denied' });
      return;
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    const fieldMap: Record<string, unknown> = {
      name: input.name?.trim(),
      destination: input.destination?.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      activities: input.activities ? `{${input.activities.join(',')}}` : undefined,
      traveler_ids: input.traveler_ids ? `{${input.traveler_ids.join(',')}}` : undefined,
      notes: input.notes,
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
    const result = await pool.query<Trip>(
      `UPDATE trips SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIdx}
       RETURNING *`,
      params
    );

    res.json({ trip: result.rows[0] });
  } catch (err) {
    console.error('[tripController.updateTrip]', err);
    res.status(500).json({ error: 'Failed to update trip' });
  }
}

/** DELETE /api/trips/:id */
export async function deleteTrip(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const householdId = req.user?.householdId ?? null;

  try {
    const result = await pool.query(
      'DELETE FROM trips WHERE id = $1 AND household_id = $2 RETURNING id',
      [id, householdId]
    );

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Trip not found or access denied' });
      return;
    }

    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    console.error('[tripController.deleteTrip]', err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
}

/** POST /api/trips/:id/packlist */
export async function generatePacklist(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const householdId = req.user?.householdId ?? null;

  try {
    const tripResult = await pool.query<Trip>(
      'SELECT * FROM trips WHERE id = $1 AND household_id = $2',
      [id, householdId]
    );

    const trip = tripResult.rows[0];
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const nights = differenceInDays(new Date(trip.end_date), new Date(trip.start_date));

    // Fetch weather forecast
    let weatherForecast = trip.weather_cache?.forecast ?? null;
    if (!weatherForecast) {
      try {
        weatherForecast = await getWeatherForecast(trip.destination, Math.min(nights + 1, 14));
        await pool.query(
          `UPDATE trips SET weather_cache = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify({ fetched_at: new Date().toISOString(), forecast: weatherForecast }), id]
        );
      } catch (weatherErr) {
        console.warn('[tripController.generatePacklist] Weather fetch failed:', weatherErr);
      }
    }

    // Fetch wardrobes for each traveler
    const wardrobes: Record<string, ClothingItem[]> = {};
    for (const travelerId of trip.traveler_ids) {
      const itemsResult = await pool.query<ClothingItem>(
        'SELECT * FROM clothing_items WHERE user_id = $1 AND is_active = true',
        [travelerId]
      );
      wardrobes[travelerId] = itemsResult.rows;
    }

    const tripInfo = {
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date.toString(),
      end_date: trip.end_date.toString(),
      nights,
      activities: trip.activities ?? [],
      traveler_ids: trip.traveler_ids,
    };

    const packlist = await generateTripPacklist(tripInfo, wardrobes, weatherForecast);

    // Save packlist to trip
    await pool.query(
      'UPDATE trips SET packlist = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(packlist), id]
    );

    res.json({ packlist });
  } catch (err) {
    console.error('[tripController.generatePacklist]', err);
    res.status(500).json({ error: 'Failed to generate packlist' });
  }
}

/** PATCH /api/trips/:id/packlist/item */
export async function updatePacklistItem(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const householdId = req.user?.householdId ?? null;
  const { user_id, item_id, packed, notes } = req.body as UpdatePacklistInput;

  if (!user_id || !item_id || packed === undefined) {
    res.status(400).json({ error: 'user_id, item_id, and packed are required' });
    return;
  }

  try {
    const tripResult = await pool.query<Trip>(
      'SELECT * FROM trips WHERE id = $1 AND household_id = $2',
      [id, householdId]
    );

    const trip = tripResult.rows[0];
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const currentPacklist: PacklistByUser = (trip.packlist as PacklistByUser) ?? {};
    const userItems = currentPacklist[user_id] ?? [];

    const existingIdx = userItems.findIndex((i) => i.item_id === item_id);
    if (existingIdx >= 0) {
      userItems[existingIdx] = { item_id, packed, notes };
    } else {
      userItems.push({ item_id, packed, notes });
    }

    currentPacklist[user_id] = userItems;

    await pool.query(
      'UPDATE trips SET packlist = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(currentPacklist), id]
    );

    res.json({ packlist: currentPacklist });
  } catch (err) {
    console.error('[tripController.updatePacklistItem]', err);
    res.status(500).json({ error: 'Failed to update packlist item' });
  }
}

/** GET /api/trips/:id/weather */
export async function getTripWeather(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.params;
  const householdId = req.user?.householdId ?? null;

  try {
    const tripResult = await pool.query<Trip>(
      'SELECT * FROM trips WHERE id = $1 AND household_id = $2',
      [id, householdId]
    );

    const trip = tripResult.rows[0];
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const nights = differenceInDays(new Date(trip.end_date), new Date(trip.start_date));
    const forecast = await getWeatherForecast(trip.destination, Math.min(nights + 1, 14));

    await pool.query(
      'UPDATE trips SET weather_cache = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify({ fetched_at: new Date().toISOString(), forecast }), id]
    );

    res.json({ forecast });
  } catch (err) {
    console.error('[tripController.getTripWeather]', err);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
}
