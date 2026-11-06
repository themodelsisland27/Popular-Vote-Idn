import type { Request, Response } from 'express';
import { app, initializeBackend } from '../src/server/app.ts';

let isReady = false;

export default async function handler(req: Request, res: Response) {
  if (!isReady) {
    try {
      await initializeBackend();
    } catch (e) {
      console.error('Error during Vercel serverless init:', e);
    }
    isReady = true;
  }
  return app(req, res);
}
