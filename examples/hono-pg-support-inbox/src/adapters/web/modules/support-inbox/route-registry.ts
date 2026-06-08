import { ticketsRouteEntry } from './tickets/route.entry.js';
import type { SupportInboxRouteEntry } from './route-entry.js';

export const supportInboxRouteEntries: readonly SupportInboxRouteEntry[] = [
  ticketsRouteEntry,
];
