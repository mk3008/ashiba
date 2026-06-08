import type { Hono } from 'hono';

import type { WebAppDependencies } from './app.js';
import { mountSupportInboxWebRoutes } from './modules/support-inbox/routes.js';

export function mountWebRoutes(app: Hono, dependencies: WebAppDependencies): void {
  mountSupportInboxWebRoutes(app, dependencies);
}
