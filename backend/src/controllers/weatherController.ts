import { Request, Response } from 'express';
import { getWeatherForecast, getCurrentWeatherData } from '../services/weatherService';

/** GET /api/weather/forecast?location=&days= */
export async function getForecast(req: Request, res: Response): Promise<void> {
  const location = req.query['location'] as string | undefined;
  const daysParam = req.query['days'] as string | undefined;

  if (!location) {
    res.status(400).json({ error: 'location query parameter is required' });
    return;
  }

  const days = daysParam ? Math.min(parseInt(daysParam, 10), 14) : 7;
  if (isNaN(days) || days < 1) {
    res.status(400).json({ error: 'days must be a positive integer (max 14)' });
    return;
  }

  try {
    const forecast = await getWeatherForecast(location, days);
    res.json({ location, days, forecast });
  } catch (err) {
    console.error('[weatherController.getForecast]', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch weather forecast';
    res.status(502).json({ error: message });
  }
}

/** GET /api/weather/current?location= */
export async function getCurrentWeather(req: Request, res: Response): Promise<void> {
  const location = req.query['location'] as string | undefined;

  if (!location) {
    res.status(400).json({ error: 'location query parameter is required' });
    return;
  }

  try {
    const weather = await getCurrentWeatherData(location);
    res.json({ location, weather });
  } catch (err) {
    console.error('[weatherController.getCurrentWeather]', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch current weather';
    res.status(502).json({ error: message });
  }
}
