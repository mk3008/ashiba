import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Pool } from 'pg';

import { createWebApp } from '#adapters/web/app.js';
import { seedSupportInbox } from '../../../../../../../scripts/seed.js';
import { parseTicketFilters } from '../request/tickets.request.js';
import { loadSupportInbox } from '../view/tickets.presenter.js';

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
    expect(html).toContain('GET /tickets');
    expect(html).toContain('<td>$1</td><td>limit</td><td>10</td>');
    expect(html).toContain('<td>$2</td><td>offset</td><td>0</td>');
    expect(html).toContain('tag_matched_tickets as');
    expect(html).toContain('join filtered_tickets as ft on ft.ticket_id = tm.ticket_id');
    expect(html).toContain('join searchable_tickets as st on st.ticket_id = ttl.ticket_id');
    expect(html).toContain('order by');
    expect(html).toContain('st.ticket_id');
    expect(html).not.toContain('INFO');
    expect(html).not.toContain('リクエスト概要');
    expect(html).not.toContain('現在の条件');
    expect(html).not.toContain('説明');
    expect(html).not.toContain('実行ログ');
    expect(html).not.toContain('[now] bound names');
    expect(html).toContain('並び順: 未指定');
    expect(html).toContain('order by');
    expect(html).toContain('st.ticket_id');
    expect(html).not.toContain('order by case when t.sla_due_at is not null');
  });

  test('proves complex canonical list semantics without dynamic sort', async () => {
    const context = {
      requestId: 'verification-value-audit',
      apiMethod: 'GET',
      apiPath: '/tickets',
      apiRoute: '/tickets',
      operation: 'list-tickets-semantics',
    };
    const initial = await loadSupportInbox(
      pool,
      parseTicketFilters(new URL('http://localhost/tickets')),
      context,
    );
    const billing = initial.tickets.find((ticket) => ticket.ticket_id === '10248');

    expect(initial.tickets).toHaveLength(10);
    expect(initial.pagination).toMatchObject({ totalCount: 31, totalPages: 4, hasNext: true });
    expect(billing).toMatchObject({
      total_count: '31',
      subject: '請求書のダウンロードができない',
      latest_sender_role: 'customer',
      latest_message_body: '他のブラウザでも試しましたが、同じエラーが出ます。',
      sla_state: 'breached',
      tag_slugs: ['billing'],
      action_required: 1,
      priority_rank: 1,
      vip_rank: 1,
    });

    const open = await loadSupportInbox(
      pool,
      parseTicketFilters(new URL('http://localhost/tickets?status=open')),
      context,
    );
    expect(open.tickets.map((ticket) => ticket.subject)).toEqual([
      'プランの変更方法を教えてください',
      'ログインできません',
    ]);

    const keyword = await loadSupportInbox(
      pool,
      parseTicketFilters(new URL('http://localhost/tickets?keyword=ログイン')),
      context,
    );
    expect(keyword.tickets.map((ticket) => ticket.subject)).toEqual(['ログインできません']);

    const secondPage = await loadSupportInbox(
      pool,
      parseTicketFilters(new URL('http://localhost/tickets?status=waiting_agent&page=2')),
      context,
    );
    expect(secondPage.tickets).toHaveLength(10);
    expect(secondPage.pagination).toMatchObject({ totalCount: 21, totalPages: 3, hasPrevious: true, hasNext: true });
  });

  test('executes the ticket-detail canonical SQL against physical PostgreSQL rows', async () => {
    const context = {
      requestId: 'ticket-detail-physical-proof',
      apiMethod: 'GET',
      apiPath: '/tickets',
      apiRoute: '/tickets',
      operation: 'ticket-detail-physical-proof',
    };
    const detail = await loadSupportInbox(
      pool,
      parseTicketFilters(new URL('http://localhost/tickets?ticketId=10248')),
      context,
    );

    expect(detail.selectedTicket?.messages.map((message) => message.message_body)).toEqual([
      '請求書のダウンロードができません。PDFをクリックしてもエラーになります。',
      'ご連絡ありがとうございます。詳細を確認いたします。',
      '他のブラウザでも試しましたが、同じエラーが出ます。',
    ]);

    const inserted = await pool.query<{ ticket_id: string }>(
      `insert into public.tickets (
        customer_id, subject, status, priority, language, channel, created_at, updated_at
      ) values (1, 'Physical left join proof', 'open', 'low', 'en', 'web', now(), now())
      returning ticket_id`,
    );
    const ticketId = inserted.rows[0]?.ticket_id;
    try {
      const noMessages = await loadSupportInbox(
        pool,
        parseTicketFilters(new URL(`http://localhost/tickets?ticketId=${ticketId}`)),
        context,
      );
      expect(noMessages.selectedTicket?.messages).toEqual([
        expect.objectContaining({
          ticket_id: ticketId,
          subject: 'Physical left join proof',
          message_id: null,
          message_body: null,
        }),
      ]);
    } finally {
      await pool.query('delete from public.tickets where ticket_id = $1', [ticketId]);
    }
  });

  test('renders the new ticket form', async () => {
    const response = await app.request('/tickets/new');
    const html = await response.text();

    expect(response.status).toBe(200);
    expectReadyHtml(html);
    expect(html).toContain('新規チケット');
    expect(html).toContain('action="/tickets" method="post"');
    expect(html).toContain('山田 太郎');
    expect(html).toContain('初回メッセージ');
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
    expect(html).toContain('cast(st.customer_name as text) asc, st.updated_at desc, st.ticket_id asc');
    expect(html).toContain('data-sort-key="customer_name">顧客<span class="sortMarker">↑</span>');
    expect(html).toContain('data-sort-key="updated_at">更新日時<span class="sortMarker">↓2</span>');
  });

  test('creates a ticket and initial customer message through the HTTP route', async () => {
    const body = new URLSearchParams({
      customer_id: '1',
      subject: 'CUDデモから登録した問い合わせ',
      priority: 'high',
      language: 'ja',
      channel: 'email',
      sla_due_at: '',
      message_body: 'Create flowで登録された初回メッセージです。',
    });
    const createResponse = await app.request('/tickets', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    expect(createResponse.status).toBe(303);
    const location = createResponse.headers.get('location');
    expect(location).toMatch(/^\/tickets\?ticketId=\d+#ticket-detail$/);
    const ticketId = location?.match(/ticketId=(\d+)/)?.[1];
    expect(ticketId).toBeTruthy();

    const detailResponse = await app.request(location ?? '/tickets');
    const html = await detailResponse.text();

    expect(detailResponse.status).toBe(200);
    expectReadyHtml(html);
    expect(html).toContain('CUDデモから登録した問い合わせ');
    expect(html).toContain('Create flowで登録された初回メッセージです。');
    expect(html).toContain('山田 太郎');

    const ticketResult = await pool.query<{
      ticket_id: string;
      customer_id: string;
      subject: string;
      status: string;
      priority: string;
      language: string;
      channel: string;
      sla_due_at: Date | null;
      version_key: number;
      metadata: Record<string, unknown>;
    }>(
      `select ticket_id, customer_id, subject, status, priority, language, channel, sla_due_at, version_key, metadata
       from public.tickets
       where ticket_id = $1`,
      [ticketId],
    );
    expect(ticketResult.rows).toEqual([expect.objectContaining({
      customer_id: '1',
      subject: 'CUDデモから登録した問い合わせ',
      status: 'waiting_agent',
      priority: 'high',
      language: 'ja',
      channel: 'email',
      sla_due_at: null,
      version_key: 1,
      metadata: {},
    })]);

    const messageResult = await pool.query<{
      sender_name: string;
      sender_role: string;
      body: string;
    }>(
      `select sender_name, sender_role, body
       from public.ticket_messages
       where ticket_id = $1
       order by message_id`,
      [ticketId],
    );
    expect(messageResult.rows).toEqual([{
      sender_name: '山田 太郎',
      sender_role: 'customer',
      body: 'Create flowで登録された初回メッセージです。',
    }]);
  });

  test('rolls back the ticket insert when the initial message insert fails', async () => {
    const subject = 'rollbackされるCreateテスト';
    const forcedFailureBody = 'forced message insert rollback probe';

    try {
      await pool.query(`
        create or replace function public.fail_ticket_message_insert_for_test()
        returns trigger
        language plpgsql
        as $$
        begin
          if new.body = 'forced message insert rollback probe' then
            raise exception 'forced message insert failure';
          end if;
          return new;
        end;
        $$;
      `);
      await pool.query(`
        create trigger fail_ticket_message_insert_for_test
        before insert on public.ticket_messages
        for each row
        execute function public.fail_ticket_message_insert_for_test();
      `);

      const createResponse = await app.request('/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          customer_id: '1',
          subject,
          priority: 'medium',
          language: 'ja',
          channel: 'web',
          sla_due_at: '',
          message_body: forcedFailureBody,
        }),
      });
      const html = await createResponse.text();

      expect(createResponse.status).toBe(400);
      expect(html).toContain('forced message insert failure');
    } finally {
      await pool.query('drop trigger if exists fail_ticket_message_insert_for_test on public.ticket_messages');
      await pool.query('drop function if exists public.fail_ticket_message_insert_for_test()');
    }

    const remainingTickets = await pool.query<{ count: string }>(
      'select count(*)::text as count from public.tickets where subject = $1',
      [subject],
    );
    expect(remainingTickets.rows[0]?.count).toBe('0');
  });

  test('updates ticket status with optimistic concurrency control', async () => {
    const initial = await pool.query<{ ticket_id: string; version_key: number }>(
      `select ticket_id, version_key
       from public.tickets
       where status = 'waiting_agent'
       order by ticket_id
       limit 1`,
    );
    const ticket = initial.rows[0];
    expect(ticket).toBeTruthy();

    const updateResponse = await app.request(`/tickets/${ticket.ticket_id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        status: 'resolved',
        expected_version_key: String(ticket.version_key),
        return_to: `/tickets?status=waiting_agent&sort=priority-high&ticketId=${ticket.ticket_id}#ticket-detail`,
      }),
    });

    expect(updateResponse.status).toBe(303);
    expect(updateResponse.headers.get('location')).toBe(`/tickets?status=waiting_agent&sort=priority-high&ticketId=${ticket.ticket_id}#ticket-detail`);

    const updated = await pool.query<{ status: string; version_key: number }>(
      `select status, version_key
       from public.tickets
       where ticket_id = $1`,
      [ticket.ticket_id],
    );
    expect(updated.rows[0]).toEqual({
      status: 'resolved',
      version_key: ticket.version_key + 1,
    });
  });

  test('returns 409 when ticket status update uses a stale version_key', async () => {
    const initial = await pool.query<{ ticket_id: string; version_key: number; status: string }>(
      `select ticket_id, version_key, status
       from public.tickets
       where status = 'waiting_agent'
       order by ticket_id
       limit 1`,
    );
    const ticket = initial.rows[0];
    expect(ticket).toBeTruthy();

    await pool.query(
      `update public.tickets
       set version_key = version_key + 1
       where ticket_id = $1`,
      [ticket.ticket_id],
    );

    const conflictResponse = await app.request(`/tickets/${ticket.ticket_id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        status: 'resolved',
        expected_version_key: String(ticket.version_key),
      }),
    });
    const html = await conflictResponse.text();

    expect(conflictResponse.status).toBe(409);
    expect(html).toContain('OPTIMISTIC_CONCURRENCY_CONFLICT');
    expect(html).toContain('version_key');

    const unchanged = await pool.query<{ status: string }>(
      `select status
       from public.tickets
       where ticket_id = $1`,
      [ticket.ticket_id],
    );
    expect(unchanged.rows[0]?.status).toBe(ticket.status);
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
