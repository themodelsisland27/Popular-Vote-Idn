import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { app, initializeBackend } from './src/server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Serve static assets in production
app.use(express.static(path.resolve(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

async function startServer() {
  await initializeBackend();
  app.listen(PORT, () => {
    console.log(`POPULAR VOTE ID server running on port ${PORT}`);
  });
}

startServer();
