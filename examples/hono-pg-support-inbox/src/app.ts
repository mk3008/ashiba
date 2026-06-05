import { Hono } from 'hono';
import type { Pool } from 'pg';

import { parseTicketFilters } from './demo/request.js';
import { renderError, renderSupportInbox } from './demo/render.js';
import { loadSupportInbox } from './demo/service.js';

export function createApp(pool: Pool): Hono {
  const app = new Hono();

  app.get('/', (c) => c.redirect('/tickets'));

  app.get('/healthz', (c) => c.json({ ok: true }));

  app.get('/tickets', async (c) => {
    const filters = parseTicketFilters(new URL(c.req.url));
    try {
      const viewModel = await loadSupportInbox(pool, filters);
      return c.html(renderSupportInbox(filters, viewModel));
    } catch (error) {
      c.status(503);
      return c.html(renderError(error));
    }
  });

  return app;
}
