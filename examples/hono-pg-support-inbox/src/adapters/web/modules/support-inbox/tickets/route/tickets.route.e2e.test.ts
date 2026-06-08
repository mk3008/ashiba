import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Pool } from 'pg';

import { createWebApp } from '#adapters/web/app.js';
import { seedSupportInbox } from '../../../../../../../scripts/seed.js';

const skipDbBackedTests = process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1';
const describeDb = skipDbBackedTests ? describe.skip : describe;

describeDb('support inbox HTTP filters', () => {
  const connectionString = process.env.ASHIBA_TEST_DATABASE_URL || 'postgres://skip:skip@localhost:1/skip';
  if (!skipDbBackedTests && !process.env.ASHIBA_TEST_DATABASE_URL) {
    throw new Error('Set ASHIBA_TEST_DATABASE_URL before running support inbox HTTP tests.');
  }

  const pool = new Pool({ connectionString });
  const app = createWebApp({ pool });

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
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(html).toContain('31件のチケット');
    expect(html).toContain('1 / 4ページ・表示 10件');
    expect(html).toContain('href="/tickets?page=2#ticket-list">次へ</a>');
    expect(html).toContain('#ticket-detail');
    expect(html).toContain('data-sort-key="customer_name"');
    expect(html).toContain('href="/tickets?sort=customer_name.asc#ticket-list"');
    expect(html).toContain('請求書のダウンロードができない');
    expect(html).toContain('Live Query Console');
    expect(html).toContain('<td>$1</td><td>limit</td><td>10</td>');
    expect(html).toContain('<td>$2</td><td>offset</td><td>0</td>');
    expect(html).toContain('with tag_matched_tickets as');
    expect(html).toContain('join filtered_tickets ft on ft.ticket_id = tm.ticket_id');
    expect(html).toContain('join searchable_tickets st on st.ticket_id = ttl.ticket_id');
    expect(html).toContain('order by st.ticket_id');
    expect(html).not.toContain('INFO');
    expect(html).not.toContain('リクエスト概要');
    expect(html).not.toContain('現在の条件');
    expect(html).not.toContain('説明');
    expect(html).not.toContain('実行ログ');
    expect(html).not.toContain('[now] bound names');
    expect(html).toContain('並び順: 未指定');
    expect(html).toContain('order by st.ticket_id');
    expect(html).not.toContain('order by case when t.sla_due_at is not null');
  });

  test('preserves inbound request id for log correlation', async () => {
    const response = await app.request('/tickets', {
      headers: { 'x-request-id': 'support-inbox-test-request' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('support-inbox-test-request');
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
    expect(html).toContain('<td>$1</td><td>status</td><td>open</td>');
    expect(html).toContain('<td>$2</td><td>limit</td><td>10</td>');
    expect(html).not.toContain('cast($1 as text) is null or t.status = $2');
    expect(html).not.toContain('where true');
  });

  test('renders keyword search', async () => {
    const response = await app.request('/tickets?keyword=ログイン&sort=action-required');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('1件のチケット');
    expect(html).toContain('ログインできません');
    expect(html).not.toContain('請求書のダウンロードができない');
    expect(html).toContain('ft.subject ilike &#39;%&#39; || $');
    expect(html).toContain('ft.customer_name ilike &#39;%&#39; || $');
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
      count: '7件のチケット',
      includes: ['請求書のダウンロードができない', 'ログインできません'],
      excludes: ['プランの変更方法を教えてください'],
    },
    {
      label: 'language',
      path: '/tickets?language=en&sort=action-required',
      count: '5件のチケット',
      includes: ['英語のドキュメントはありますか?', 'Global Inc.'],
      excludes: ['ログインできません'],
    },
    {
      label: 'channel',
      path: '/tickets?channel=web&sort=action-required',
      count: '11件のチケット',
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

  test('paginates ten tickets per page and keeps query state in page links', async () => {
    const firstPage = await app.request('/tickets?status=waiting_agent&sort=action-required');
    const firstHtml = await firstPage.text();

    expect(firstPage.status).toBe(200);
    expectReadyHtml(firstHtml);
    expect(firstHtml).toContain('21件のチケット');
    expect(firstHtml).toContain('1 / 3ページ・表示 10件');
    expect(firstHtml).toContain('href="/tickets?status=waiting_agent&sort=action-required&page=2#ticket-list">次へ</a>');

    const secondPage = await app.request('/tickets?status=waiting_agent&sort=action-required&page=2');
    const secondHtml = await secondPage.text();

    expect(secondPage.status).toBe(200);
    expectReadyHtml(secondHtml);
    expect(secondHtml).toContain('21件のチケット');
    expect(secondHtml).toContain('2 / 3ページ・表示 10件');
    expect(secondHtml).toContain('href="/tickets?status=waiting_agent&sort=action-required#ticket-list">前へ</a>');
    expect(secondHtml).toContain('href="/tickets?status=waiting_agent&sort=action-required&page=3#ticket-list">次へ</a>');
  });

  test('does not render pagination for draft shortcut with fewer than ten tickets', async () => {
    const response = await app.request('/tickets?status=draft');
    const html = await response.text();

    expect(response.status).toBe(200);
    expectReadyHtml(html);
    expect(html).toContain('6件のチケット');
    expect(html).toContain('1 / 1ページ・表示 6件');
    expect(html).not.toContain('class="pagination"');
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
    expect(html).toContain('31件のチケット');
    expect(html).toContain(label);
  });

  test('renders header multi-sort choices through the HTTP route', async () => {
    const response = await app.request('/tickets?sort=customer_name.asc,updated_at.desc');
    const html = await response.text();

    expect(response.status).toBe(200);
    expectReadyHtml(html);
    expect(html).toContain('並び順: 顧客 昇順 → 更新日時 降順');
    expect(html).toContain('order by cast(st.customer_name as text) asc, st.updated_at desc, st.ticket_id');
    expect(html).toContain('data-sort-key="customer_name">顧客<span class="sortMarker">↑</span>');
    expect(html).toContain('data-sort-key="updated_at">更新日時<span class="sortMarker">↓2</span>');
  });
});

describe('support inbox demo error messages', () => {
  test('explains query metadata drift separately from database startup', async () => {
    const app = createWebApp({
      pool: failingPool(Object.assign(new Error('Query model binding metadata was generated from different source SQL.'), {
        code: 'ASHIBA_QUERY_MODEL_STALE',
      })),
    });

    const response = await app.request('/tickets');
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(html).toContain('The visible SQL and generated Ashiba metadata are out of sync.');
    expect(html).toContain('check:drift');
    expect(html).toContain('This is not a PostgreSQL startup or seed-data problem.');
    expect(html).toContain('code: ASHIBA_QUERY_MODEL_STALE');
    expect(html).not.toContain('PostgreSQL is not reachable or the seed data has not been loaded.');
  });

  test('keeps PostgreSQL connection failures actionable', async () => {
    const app = createWebApp({
      pool: failingPool(Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:55433'), {
        code: 'ECONNREFUSED',
      })),
    });

    const response = await app.request('/tickets');
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(html).toContain('PostgreSQL is not reachable.');
    expect(html).toContain('db:up');
    expect(html).toContain('docker compose up -d');
    expect(html).toContain('ASHIBA_TEST_DB_PORT');
    expect(html).toContain('code: ECONNREFUSED');
  });
});

function expectReadyHtml(html: string): void {
  expect(html).not.toContain('Demo is not ready');
  expect(html).not.toContain('PostgreSQL is not reachable');
}

function failingPool(error: Error): Pool {
  return {
    async query() {
      throw error;
    },
  } as unknown as Pool;
}
