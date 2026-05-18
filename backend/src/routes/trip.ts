import { Router } from 'express';
import {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  generatePacklist,
  updatePacklistItem,
  getTripWeather,
} from '../controllers/tripController';
import { authenticate } from '../middleware/auth';
import { apiRateLimit, aiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiRateLimit);

/** GET /api/trips */
router.get('/', getTrips);

/** GET /api/trips/:id */
router.get('/:id', getTrip);

/** POST /api/trips */
router.post('/', createTrip);

/** PUT /api/trips/:id */
router.put('/:id', updateTrip);

/** DELETE /api/trips/:id */
router.delete('/:id', deleteTrip);

/** POST /api/trips/:id/packlist */
router.post('/:id/packlist', aiRateLimit, generatePacklist);

/** PATCH /api/trips/:id/packlist/item */
router.patch('/:id/packlist/item', updatePacklistItem);

/** GET /api/trips/:id/weather */
router.get('/:id/weather', getTripWeather);

export default router;
