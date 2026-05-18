import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const router = Router();

/** POST /api/auth/register */
router.post('/register', authRateLimit, register);

/** POST /api/auth/login */
router.post('/login', authRateLimit, login);

/** GET /api/auth/me */
router.get('/me', authenticate, getMe);

export default router;
