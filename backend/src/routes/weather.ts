import { Router } from 'express';
import { getForecast, getCurrentWeather } from '../controllers/weatherController';
import { authenticate } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiRateLimit);

/** GET /api/weather/forecast?location=&days= */
router.get('/forecast', getForecast);

/** GET /api/weather/current?location= */
router.get('/current', getCurrentWeather);

export default router;
