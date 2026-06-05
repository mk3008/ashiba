import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Pool } from 'pg';

import { createApp } from '../app.js';
import { seedSupportInbox } from '../../scripts/seed.js';

describe('support inbox HTTP filters', () => {
  const connectionString = process.env.ASHIBA_TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set ASHIBA_TEST_DATABASE_URL before running support inbox HTTP tests.');
  }

  const pool = new Pool({ connectionString });
  const app = createApp(pool);

  beforeAll(async () => {
    await seedSupportInbox(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  test('renders the initial inbox', async () => {
    const response = await app.request('/tickets');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('7件のチケット');
    expect(html).toContain('請求書のダウンロードができない');
  });

  test('renders status=open search without PostgreSQL parameter type errors', async () => {
    const response = await app.request('/tickets?status=open&customerTier=&slaState=&language=&channel=&tag=&keyword=&sort=action-required');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('2件のチケット');
    expect(html).toContain('ログインできません');
    expect(html).toContain('プランの変更方法を教えてください');
    expect(html).not.toContain('Demo is not ready');
  });

  test('renders keyword search', async () => {
    const response = await app.request('/tickets?keyword=ログイン&sort=action-required');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('1件のチケット');
    expect(html).toContain('ログインできません');
    expect(html).not.toContain('請求書のダウンロードができない');
  });
});
