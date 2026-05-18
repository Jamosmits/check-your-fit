import { Router } from 'express';
import { startScan, getScanStatus, confirmScanResults } from '../controllers/scanController';
import { authenticate } from '../middleware/auth';
import { uploadScanMedia } from '../middleware/upload';
import { scanRateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);

/** POST /api/scan/start */
router.post('/start', scanRateLimit, uploadScanMedia, startScan);

/** GET /api/scan/:jobId/status */
router.get('/:jobId/status', getScanStatus);

/** POST /api/scan/:jobId/confirm */
router.post('/:jobId/confirm', confirmScanResults);

export default router;
