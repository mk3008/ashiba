import { readFile } from 'node:fs/promises';

import { Hono } from 'hono';
import type { Pool } from 'pg';

import { mountWebRoutes } from './routes.js';

export type WebAppDependencies = {
  pool: Pool;
};

export function createWebApp(dependencies: WebAppDependencies): Hono {
  const app = new Hono();

  app.get('/', (c) => c.redirect('/tickets'));
  app.get('/healthz', (c) => c.json({ ok: true }));
  app.get('/assets/ashiba-icon.jpg', async () => {
    const icon = await readFile(new URL('./assets/ashiba-icon.jpg', import.meta.url));
    return new Response(icon, {
      headers: {
        'cache-control': 'public, max-age=86400',
        'content-type': 'image/jpeg',
      },
    });
  });

  mountWebRoutes(app, dependencies);

  return app;
}
