import express from 'express';
import { apiRouter } from './api.ts';
import { seedDatabase } from '../db/seed.ts';

export const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API router mounted on /api as well as fallback for serverless functions where prefix may be stripped
app.use('/api', apiRouter);
app.use(apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

let isSeeded = false;
export async function initializeBackend() {
  if (!isSeeded) {
    try {
      await seedDatabase();
      isSeeded = true;
    } catch (err) {
      console.error('Failed to initialize database seeding:', err);
    }
  }
}
