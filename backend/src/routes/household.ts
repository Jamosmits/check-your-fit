import { Router } from 'express';
import {
  createHousehold,
  joinHousehold,
  getHousehold,
  getMembers,
  leaveHousehold,
} from '../controllers/householdController';
import { authenticate } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiRateLimit);

/** POST /api/household */
router.post('/', createHousehold);

/** POST /api/household/join */
router.post('/join', joinHousehold);

/** GET /api/household */
router.get('/', getHousehold);

/** GET /api/household/members */
router.get('/members', getMembers);

/** DELETE /api/household/leave */
router.delete('/leave', leaveHousehold);

export default router;
