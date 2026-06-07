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
    expect(html).toContain('公開 safe sort');
    expect(html).toContain('action_required asc, sla_due_at asc, updated_at desc');
    expect(html).toContain('ticket_id asc');
    expect(html).toContain('SQL inspection');
    expect(html).toContain('selected sort');
    expect(html).toContain('safe sort keys');
    expect(html).toContain('bound names');
    expect(html).toContain('order by case when t.sla_due_at is not null');
    expect(html).toContain('t.updated_at desc, t.ticket_id');
  });

  test('renders status=open search without PostgreSQL parameter type errors', async () => {
    const response = await app.request('/tickets?status=open&customerTier=&slaState=&language=&channel=&tag=&keyword=&sort=action-required');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('2件のチケット');
    expect(html).toContain('ログインできません');
    expect(html).toContain('プランの変更方法を教えてください');
    expect(html).not.toContain('Demo is not ready');
    expect(html).toContain('t.status = $1');
    expect(html).not.toContain('cast($1 as text) is null or t.status = $2');
  });

  test('renders keyword search', async () => {
    const response = await app.request('/tickets?keyword=ログイン&sort=action-required');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('1件のチケット');
    expect(html).toContain('ログインできません');
    expect(html).not.toContain('請求書のダウンロードができない');
    expect(html).toContain('t.subject ilike &#39;%&#39; || $');
    expect(html).toContain('c.name ilike &#39;%&#39; || $');
    expect(html).toContain('lm.latest_message_body ilike &#39;%&#39; || $');
  });

  test.each([
    {
      label: 'customer tier',
      path: '/tickets?customerTier=vip&sort=action-required',
      count: '3件のチケット',
      includes: ['山田 太郎', '株式会社ABC', 'Global Inc.'],
      excludes: ['株式会社XYZ'],
    },
    {
      label: 'SLA state',
      path: '/tickets?slaState=breached&sort=action-required',
      count: '2件のチケット',
      includes: ['請求書のダウンロードができない', 'ログインできません'],
      excludes: ['プランの変更方法を教えてください'],
    },
    {
      label: 'language',
      path: '/tickets?language=en&sort=action-required',
      count: '1件のチケット',
      includes: ['英語のドキュメントはありますか?', 'Global Inc.'],
      excludes: ['ログインできません'],
    },
    {
      label: 'channel',
      path: '/tickets?channel=web&sort=action-required',
      count: '2件のチケット',
      includes: ['アカウントの権限について', 'プランの変更方法を教えてください'],
      excludes: ['APIレスポンスが遅い'],
    },
    {
      label: 'tag',
      path: '/tickets?tag=billing&sort=action-required',
      count: '2件のチケット',
      includes: ['請求書のダウンロードができない', 'プランの変更方法を教えてください'],
      excludes: ['ログインできません'],
    },
  ])('renders $label filter through the HTTP route', async ({ path, count, includes, excludes }) => {
    const response = await app.request(path);
    const html = await response.text();

    expect(response.status).toBe(200);
    expectReadyHtml(html);
    expect(html).toContain(count);
    for (const text of includes) {
      expect(html).toContain(text);
    }
    for (const text of excludes) {
      expect(html).not.toContain(text);
    }
  });

  test.each([
    ['/tickets?sort=action-required', '並び順: アクション優先'],
    ['/tickets?sort=priority-high', '並び順: 優先度: 高い順'],
    ['/tickets?sort=sla-soon', '並び順: SLA期限: 早い順'],
    ['/tickets?sort=customer-reply-new', '並び順: 顧客からの返信: 新しい順'],
    ['/tickets?sort=updated-new', '並び順: 更新日時: 新しい順'],
    ['/tickets?sort=vip-first', '並び順: VIP優先'],
  ])('renders safe sort choice %s through the HTTP route', async (path, label) => {
    const response = await app.request(path);
    const html = await response.text();

    expect(response.status).toBe(200);
    expectReadyHtml(html);
    expect(html).toContain('7件のチケット');
    expect(html).toContain(label);
  });
});

function expectReadyHtml(html: string): void {
  expect(html).not.toContain('Demo is not ready');
  expect(html).not.toContain('PostgreSQL is not reachable');
}
