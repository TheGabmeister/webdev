import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import app from './app.js';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production, serve the built Vue SPA
if (env.isProduction) {
  const clientDir = path.join(__dirname, 'client');
  app.use(express.static(clientDir));

  // SPA fallback — send index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientDir, 'index.html'));
    }
  });
} else {
  // In development, use Vite dev middleware
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
