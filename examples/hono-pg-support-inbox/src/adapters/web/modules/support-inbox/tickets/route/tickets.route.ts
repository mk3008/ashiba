import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';

import { logApiRequest } from '#adapters/logger/appLogger.js';
import { createPgSqlClient, withPgTransaction } from '#adapters/pg/pool.js';
import { execute as executeCreateTicket } from '#features/support-inbox/create-ticket/boundary.js';
import { execute as executeListTicketCustomerOptions } from '#features/support-inbox/list-ticket-customer-options/boundary.js';
import { execute as executeUpdateTicketStatus } from '#features/support-inbox/update-ticket-status/boundary.js';
import type { WebAppDependencies } from '../../../../app.js';
import { parseTicketFilters } from '../request/tickets.request.js';
import { renderCreateTicketPage, renderError, renderSupportInbox } from '../view/tickets.page.js';
import { loadSupportInbox } from '../view/tickets.presenter.js';

export function mountTicketsRoutes(app: Hono, dependencies: WebAppDependencies): void {
  app.get('/tickets/new', async (c) => {
    const requestId = c.req.header('x-request-id') ?? randomUUID();
    const requestContext = {
      requestId,
      apiMethod: 'GET',
      apiPath: '/tickets/new',
      apiRoute: 'GET /tickets/new',
      operation: 'support-inbox.create.form',
    };
    const startedAt = Date.now();
    c.header('x-request-id', requestId);
    logApiRequest({ ...requestContext, phase: 'start' });
    try {
      const executor = createPgSqlClient(dependencies.pool, {
        executeOptions: {
          metadata: requestContext,
        },
      });
      const customers = (await executeListTicketCustomerOptions(executor, {})).items;
      logApiRequest({ ...requestContext, phase: 'end', status: 200, elapsedMs: Date.now() - startedAt });
      return c.html(renderCreateTicketPage({ customers }));
    } catch (error) {
      c.status(503);
      logApiRequest({ ...requestContext, phase: 'error', status: 503, elapsedMs: Date.now() - startedAt, error });
      return c.html(renderError(error));
    }
  });

  app.get('/tickets', async (c) => {
    const filters = parseTicketFilters(new URL(c.req.url));
    const requestId = c.req.header('x-request-id') ?? randomUUID();
    const requestContext = {
      requestId,
      apiMethod: 'GET',
      apiPath: '/tickets',
      apiRoute: 'GET /tickets',
      operation: 'support-inbox.list',
    };
    const startedAt = Date.now();
    c.header('x-request-id', requestId);
    logApiRequest({ ...requestContext, phase: 'start' });
    try {
      const viewModel = await loadSupportInbox(dependencies.pool, filters, requestContext);
      logApiRequest({ ...requestContext, phase: 'end', status: 200, elapsedMs: Date.now() - startedAt });
      return c.html(renderSupportInbox(filters, viewModel));
    } catch (error) {
      c.status(503);
      logApiRequest({ ...requestContext, phase: 'error', status: 503, elapsedMs: Date.now() - startedAt, error });
      return c.html(renderError(error));
    }
  });

  app.post('/tickets', async (c) => {
    const requestId = c.req.header('x-request-id') ?? randomUUID();
    const requestContext = {
      requestId,
      apiMethod: 'POST',
      apiPath: '/tickets',
      apiRoute: 'POST /tickets',
      operation: 'support-inbox.create',
    };
    const startedAt = Date.now();
    c.header('x-request-id', requestId);
    logApiRequest({ ...requestContext, phase: 'start' });
    try {
      const body = await c.req.parseBody();
      const result = await withPgTransaction(dependencies.pool, (executor) =>
        executeCreateTicket(executor, body),
        {
          executeOptions: {
            metadata: requestContext,
          },
        },
      );
      logApiRequest({ ...requestContext, phase: 'end', status: 303, elapsedMs: Date.now() - startedAt });
      return c.redirect(`/tickets?ticketId=${encodeURIComponent(result.ticket.ticket_id)}#ticket-detail`, 303);
    } catch (error) {
      c.status(400);
      logApiRequest({ ...requestContext, phase: 'error', status: 400, elapsedMs: Date.now() - startedAt, error });
      const executor = createPgSqlClient(dependencies.pool, {
        executeOptions: {
          metadata: requestContext,
        },
      });
      const customers = (await executeListTicketCustomerOptions(executor, {})).items;
      return c.html(renderCreateTicketPage({ customers, error }));
    }
  });

  app.post('/tickets/:ticketId/status', async (c) => {
    const ticketId = c.req.param('ticketId');
    const requestId = c.req.header('x-request-id') ?? randomUUID();
    const requestContext = {
      requestId,
      apiMethod: 'POST',
      apiPath: '/tickets/:ticketId/status',
      apiRoute: 'POST /tickets/:ticketId/status',
      operation: 'support-inbox.update-status',
    };
    const startedAt = Date.now();
    c.header('x-request-id', requestId);
    logApiRequest({ ...requestContext, phase: 'start' });
    try {
      const body = await c.req.parseBody();
      const result = await withPgTransaction(dependencies.pool, (executor) =>
        executeUpdateTicketStatus(executor, { ...body, ticket_id: ticketId }),
        {
          executeOptions: {
            metadata: requestContext,
          },
        },
      );
      const fallbackLocation = `/tickets?ticketId=${encodeURIComponent(String(result.ticket_id ?? ticketId))}#ticket-detail`;
      const location = readInternalTicketsReturnTo(body.return_to) ?? fallbackLocation;
      logApiRequest({ ...requestContext, phase: 'end', status: 303, elapsedMs: Date.now() - startedAt });
      return c.redirect(location, 303);
    } catch (error) {
      const status = error instanceof Error && error.name === 'OptimisticConcurrencyConflict' ? 409 : 400;
      c.status(status);
      logApiRequest({ ...requestContext, phase: 'error', status, elapsedMs: Date.now() - startedAt, error });
      return c.html(renderError(error));
    }
  });
}

function readInternalTicketsReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  if (value === '/tickets' || value.startsWith('/tickets?')) {
    return value;
  }
  return undefined;
}
