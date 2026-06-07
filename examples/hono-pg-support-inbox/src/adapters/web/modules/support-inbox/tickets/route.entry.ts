import type { SupportInboxRouteEntry } from '../route-entry.js';
import { mountTicketsRoutes } from './route/tickets.route.js';

export const ticketsRouteEntry: SupportInboxRouteEntry = {
  id: 'support-inbox.tickets',
  mount: mountTicketsRoutes,
};
