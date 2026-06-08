import type { Hono } from 'hono';

import type { WebAppDependencies } from '../../app.js';

export type SupportInboxRouteEntry = {
  id: string;
  mount(app: Hono, dependencies: WebAppDependencies): void;
};
