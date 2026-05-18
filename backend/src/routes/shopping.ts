import { Router } from 'express';
import {
  getSuggestions,
  generateSuggestions,
  dismissSuggestion,
  markPurchased,
  deleteSuggestion,
} from '../controllers/shoppingController';
import { authenticate } from '../middleware/auth';
import { apiRateLimit, aiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiRateLimit);

/** GET /api/shopping */
router.get('/', getSuggestions);

/** POST /api/shopping/generate */
router.post('/generate', aiRateLimit, generateSuggestions);

/** PATCH /api/shopping/:id/dismiss */
router.patch('/:id/dismiss', dismissSuggestion);

/** PATCH /api/shopping/:id/purchased */
router.patch('/:id/purchased', markPurchased);

/** DELETE /api/shopping/:id */
router.delete('/:id', deleteSuggestion);

export default router;
