import type { Hono } from 'hono';

import type { WebAppDependencies } from '../../app.js';
import { supportInboxRouteEntries } from './route-registry.js';

export function mountSupportInboxWebRoutes(app: Hono, dependencies: WebAppDependencies): void {
  for (const entry of supportInboxRouteEntries) {
    entry.mount(app, dependencies);
  }
}
