import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';

import type { WebAppDependencies } from '../../../../app.js';
import { parseTicketFilters } from '../request/tickets.request.js';
import { renderError, renderSupportInbox } from '../view/tickets.page.js';
import { loadSupportInbox } from '../view/tickets.presenter.js';

export function mountTicketsRoutes(app: Hono, dependencies: WebAppDependencies): void {
  app.get('/tickets', async (c) => {
    const filters = parseTicketFilters(new URL(c.req.url));
    const requestId = c.req.header('x-request-id') ?? randomUUID();
    c.header('x-request-id', requestId);
    try {
      const viewModel = await loadSupportInbox(dependencies.pool, filters, { requestId });
      return c.html(renderSupportInbox(filters, viewModel));
    } catch (error) {
      c.status(503);
      return c.html(renderError(error));
    }
  });
}
