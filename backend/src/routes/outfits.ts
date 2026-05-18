import { Router } from 'express';
import {
  getOutfits,
  getOutfit,
  createOutfit,
  updateOutfit,
  deleteOutfit,
  markOutfitWorn,
  getAISuggestions,
} from '../controllers/outfitController';
import { authenticate } from '../middleware/auth';
import { apiRateLimit, aiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiRateLimit);

/** GET /api/outfits */
router.get('/', getOutfits);

/** GET /api/outfits/:id */
router.get('/:id', getOutfit);

/** POST /api/outfits */
router.post('/', createOutfit);

/** PUT /api/outfits/:id */
router.put('/:id', updateOutfit);

/** DELETE /api/outfits/:id */
router.delete('/:id', deleteOutfit);

/** POST /api/outfits/:id/worn */
router.post('/:id/worn', markOutfitWorn);

/** POST /api/outfits/suggest */
router.post('/suggest', aiRateLimit, getAISuggestions);

export default router;
