import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import { ScanJob, ConfirmScanInput, ScanStatusResponse } from '../models/ScanJob';
import { AIDetectedItem } from '../models/ClothingItem';
import { analyzeWardrobePhoto } from '../services/aiService';
import { uploadFileToStorage } from '../services/imageService';

/** POST /api/scan/start */
export async function startScan(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const files = req.files as Express.Multer.File[] | undefined;
  const bodyUrls: string[] = Array.isArray(req.body['source_urls'])
    ? (req.body['source_urls'] as string[])
    : req.body['source_urls']
    ? [req.body['source_urls'] as string]
    : [];

  if ((!files || files.length === 0) && bodyUrls.length === 0) {
    res.status(400).json({ error: 'No media files or source URLs provided' });
    return;
  }

  try {
    // Upload any locally uploaded files to Supabase Storage first
    const uploadedUrls: string[] = await Promise.all(
      (files ?? []).map((file) => uploadFileToStorage(file.path, userId, 'scans'))
    );

    const sourceUrls = [...uploadedUrls, ...bodyUrls];
    const jobId = uuidv4();

    await pool.query(
      `INSERT INTO scan_jobs (id, user_id, status, progress, source_urls)
       VALUES ($1, $2, 'pending', 0, $3)`,
      [jobId, userId, `{${sourceUrls.map((u) => `"${u}"`).join(',')}}`]
    );

    // Start async processing — do NOT await
    void processJob(jobId, userId, sourceUrls);

    res.status(202).json({ job_id: jobId, status: 'pending' });
  } catch (err) {
    console.error('[scanController.startScan]', err);
    res.status(500).json({ error: 'Failed to start scan job' });
  }
}

async function processJob(
  jobId: string,
  userId: string,
  sourceUrls: string[]
): Promise<void> {
  try {
    // Mark as processing
    await pool.query(
      `UPDATE scan_jobs
       SET status = 'processing', progress = 5, started_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );

    const allDetected: AIDetectedItem[] = [];
    const total = sourceUrls.length;

    for (let i = 0; i < total; i++) {
      const url = sourceUrls[i];
      if (!url) continue;

      const progress = Math.round(5 + ((i + 1) / total) * 85);

      try {
        const detected = await analyzeWardrobePhoto(url);
        allDetected.push(...detected);
      } catch (analysisErr) {
        console.warn(`[scanController.processJob] Failed to analyse ${url}:`, analysisErr);
      }

      await pool.query(
        `UPDATE scan_jobs SET progress = $1, updated_at = NOW() WHERE id = $2`,
        [progress, jobId]
      );
    }

    await pool.query(
      `UPDATE scan_jobs
       SET status = 'awaiting_confirmation',
           progress = 90,
           detected_items = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(allDetected), jobId]
    );
  } catch (err) {
    console.error('[scanController.processJob] Fatal error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    await pool.query(
      `UPDATE scan_jobs
       SET status = 'failed', error_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [message, jobId]
    );
  }
}

/** GET /api/scan/:jobId/status */
export async function getScanStatus(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { jobId } = req.params;

  try {
    const result = await pool.query<ScanJob>(
      `SELECT * FROM scan_jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    const job = result.rows[0];
    if (!job) {
      res.status(404).json({ error: 'Scan job not found' });
      return;
    }

    const response: ScanStatusResponse = {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      detected_items: job.detected_items,
      error_message: job.error_message,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };

    res.json(response);
  } catch (err) {
    console.error('[scanController.getScanStatus]', err);
    res.status(500).json({ error: 'Failed to fetch scan status' });
  }
}

/** POST /api/scan/:jobId/confirm */
export async function confirmScanResults(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { jobId } = req.params;
  const { confirmed_items } = req.body as ConfirmScanInput;

  if (!Array.isArray(confirmed_items) || confirmed_items.length === 0) {
    res.status(400).json({ error: 'confirmed_items array is required' });
    return;
  }

  try {
    // Verify job belongs to user and is awaiting confirmation
    const jobResult = await pool.query<ScanJob>(
      `SELECT * FROM scan_jobs WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      res.status(404).json({ error: 'Scan job not found' });
      return;
    }

    if (job.status !== 'awaiting_confirmation') {
      res.status(409).json({
        error: `Cannot confirm: job is in status '${job.status}'`,
      });
      return;
    }

    const householdId = req.user?.householdId ?? null;
    const createdIds: string[] = [];

    // Create clothing items from confirmed detections
    for (const item of confirmed_items) {
      const itemId = uuidv4();

      await pool.query(
        `INSERT INTO clothing_items (
          id, user_id, household_id, name, category, subcategory,
          color, colors, brand, size, material, pattern, formality,
          season, tags, image_url, thumbnail_url, notes, ai_metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19
        )`,
        [
          itemId, userId, householdId,
          item.name, item.category, item.subcategory ?? null,
          item.color ?? null,
          item.colors ? `{${item.colors.join(',')}}` : null,
          item.brand ?? null,
          item.size ?? null,
          item.material ?? null,
          item.pattern ?? null,
          item.formality ?? null,
          item.season ? `{${item.season.join(',')}}` : null,
          item.tags ? `{${item.tags.join(',')}}` : null,
          item.image_url ?? null,
          item.thumbnail_url ?? null,
          item.notes ?? null,
          item.ai_metadata ? JSON.stringify(item.ai_metadata) : null,
        ]
      );

      createdIds.push(itemId);
    }

    // Mark job as completed
    await pool.query(
      `UPDATE scan_jobs
       SET status = 'completed',
           progress = 100,
           confirmed_items = $1,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [`{${createdIds.join(',')}}`, jobId]
    );

    res.json({
      message: 'Scan confirmed successfully',
      created_count: createdIds.length,
      item_ids: createdIds,
    });
  } catch (err) {
    console.error('[scanController.confirmScanResults]', err);
    res.status(500).json({ error: 'Failed to confirm scan results' });
  }
}
