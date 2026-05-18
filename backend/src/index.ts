import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import wardrobeRoutes from './routes/wardrobe';
import scanRoutes from './routes/scan';
import outfitRoutes from './routes/outfits';
import householdRoutes from './routes/household';
import tripRoutes from './routes/trip';
import shoppingRoutes from './routes/shopping';
import weatherRoutes from './routes/weather';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000',
  'http://localhost:8081',  // Expo dev server
  'http://localhost:19006', // Expo web
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/weather', weatherRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);

  if (err.message.startsWith('CORS:')) {
    res.status(403).json({ error: err.message });
    return;
  }

  if (err.name === 'MulterError') {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  const status = (err as { status?: number }).status ?? 500;
  const message =
    process.env['NODE_ENV'] === 'production' && status === 500
      ? 'Internal server error'
      : err.message;

  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`Check Your Fit API running on port ${PORT} [${process.env['NODE_ENV'] ?? 'development'}]`);
});

export default app;
