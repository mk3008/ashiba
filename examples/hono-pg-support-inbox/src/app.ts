import type { Pool } from 'pg';

import { createWebApp } from '#adapters/web/app.js';

export function createApp(pool: Pool) {
  return createWebApp({ pool });
}
