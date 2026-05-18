import { Router } from 'express';
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  markWorn,
} from '../controllers/wardrobeController';
import { authenticate } from '../middleware/auth';
import { uploadSingleImage } from '../middleware/upload';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

// All wardrobe routes require authentication
router.use(authenticate);
router.use(apiRateLimit);

/** GET /api/wardrobe?category=&season=&search=&user_id= */
router.get('/', getItems);

/** GET /api/wardrobe/:id */
router.get('/:id', getItem);

/** POST /api/wardrobe */
router.post('/', uploadSingleImage, createItem);

/** PUT /api/wardrobe/:id */
router.put('/:id', uploadSingleImage, updateItem);

/** DELETE /api/wardrobe/:id */
router.delete('/:id', deleteItem);

/** POST /api/wardrobe/:id/worn */
router.post('/:id/worn', markWorn);

export default router;
