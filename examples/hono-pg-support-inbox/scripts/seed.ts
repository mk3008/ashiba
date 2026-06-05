import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';

type TicketSeed = {
  ticketId: number;
  customerId: number;
  subject: string;
  status: string;
  priority: string;
  language: string;
  channel: string;
  slaOffsetHours?: number;
  createdOffsetHours: number;
  updatedOffsetHours: number;
  tags: string[];
  messages: Array<{
    senderName: string;
    senderRole: 'customer' | 'agent' | 'system';
    body: string;
    createdOffsetHours: number;
  }>;
};

const customers = [
  { customerId: 1, name: '山田 太郎', tier: 'vip', locale: 'ja' },
  { customerId: 2, name: '株式会社ABC', tier: 'vip', locale: 'ja' },
  { customerId: 3, name: '鈴木 一郎', tier: 'standard', locale: 'ja' },
  { customerId: 4, name: '株式会社XYZ', tier: 'standard', locale: 'ja' },
  { customerId: 5, name: '田中株式会社', tier: 'standard', locale: 'ja' },
  { customerId: 6, name: 'Global Inc.', tier: 'vip', locale: 'en' },
  { customerId: 7, name: '佐藤 美咲', tier: 'standard', locale: 'ja' },
];

const tags = [
  { slug: 'billing', label: '請求' },
  { slug: 'login', label: 'ログイン' },
  { slug: 'api', label: 'API' },
  { slug: 'docs', label: 'ドキュメント' },
  { slug: 'plan', label: 'プラン' },
];

const tickets: TicketSeed[] = [
  {
    ticketId: 10248,
    customerId: 1,
    subject: '請求書のダウンロードができない',
    status: 'waiting_agent',
    priority: 'high',
    language: 'ja',
    channel: 'email',
    slaOffsetHours: -1,
    createdOffsetHours: 30,
    updatedOffsetHours: 1,
    tags: ['billing'],
    messages: [
      { senderName: '山田 太郎', senderRole: 'customer', body: '請求書のダウンロードができません。PDFをクリックしてもエラーになります。', createdOffsetHours: 30 },
      { senderName: 'サポート 太郎', senderRole: 'agent', body: 'ご連絡ありがとうございます。詳細を確認いたします。', createdOffsetHours: 28 },
      { senderName: '山田 太郎', senderRole: 'customer', body: '他のブラウザでも試しましたが、同じエラーが出ます。', createdOffsetHours: 1 },
    ],
  },
  {
    ticketId: 10247,
    customerId: 2,
    subject: 'ログインできません',
    status: 'open',
    priority: 'high',
    language: 'ja',
    channel: 'chat',
    slaOffsetHours: -2,
    createdOffsetHours: 26,
    updatedOffsetHours: 2,
    tags: ['login'],
    messages: [
      { senderName: '田中 花子', senderRole: 'customer', body: 'パスワードリセットしてもログインできません。', createdOffsetHours: 2 },
    ],
  },
  {
    ticketId: 10241,
    customerId: 3,
    subject: 'アカウントの権限について',
    status: 'waiting_agent',
    priority: 'medium',
    language: 'ja',
    channel: 'web',
    slaOffsetHours: 2,
    createdOffsetHours: 9,
    updatedOffsetHours: 3,
    tags: ['plan'],
    messages: [
      { senderName: '鈴木 一郎', senderRole: 'customer', body: '管理者権限を付与してください。', createdOffsetHours: 3 },
    ],
  },
  {
    ticketId: 10245,
    customerId: 4,
    subject: 'APIレスポンスが遅い',
    status: 'waiting_customer',
    priority: 'medium',
    language: 'ja',
    channel: 'email',
    slaOffsetHours: 4,
    createdOffsetHours: 12,
    updatedOffsetHours: 4,
    tags: ['api'],
    messages: [
      { senderName: 'サポート 太郎', senderRole: 'agent', body: '調査中です。少々お待ちください。', createdOffsetHours: 4 },
    ],
  },
  {
    ticketId: 10243,
    customerId: 5,
    subject: 'プランの変更方法を教えてください',
    status: 'open',
    priority: 'low',
    language: 'ja',
    channel: 'web',
    slaOffsetHours: 18,
    createdOffsetHours: 10,
    updatedOffsetHours: 5,
    tags: ['plan', 'billing'],
    messages: [
      { senderName: '田中 花子', senderRole: 'customer', body: 'プランをアップグレードしたいです。', createdOffsetHours: 5 },
    ],
  },
  {
    ticketId: 10242,
    customerId: 6,
    subject: '英語のドキュメントはありますか?',
    status: 'waiting_agent',
    priority: 'low',
    language: 'en',
    channel: 'email',
    slaOffsetHours: 20,
    createdOffsetHours: 16,
    updatedOffsetHours: 6,
    tags: ['docs'],
    messages: [
      { senderName: 'John Smith', senderRole: 'customer', body: 'Do you have documents in English?', createdOffsetHours: 6 },
    ],
  },
  {
    ticketId: 10238,
    customerId: 7,
    subject: '二段階認証の設定方法',
    status: 'resolved',
    priority: 'low',
    language: 'ja',
    channel: 'chat',
    createdOffsetHours: 50,
    updatedOffsetHours: 24,
    tags: ['login'],
    messages: [
      { senderName: 'サポート 花子', senderRole: 'agent', body: '設定方法をご案内しました。', createdOffsetHours: 24 },
    ],
  },
];

export async function seedSupportInbox(pool: Pool): Promise<void> {
  await resetSchema(pool);
  await insertCustomers(pool);
  await insertTags(pool);
  await insertTickets(pool);
  console.log(`Seeded ${tickets.length} support tickets.`);
}

async function resetSchema(pool: Pool): Promise<void> {
  await pool.query('drop schema if exists public cascade');
  await pool.query('create schema public');
  const ddl = readFileSync(resolve('db/ddl/public.sql'), 'utf8');
  await pool.query(ddl);
}

async function insertCustomers(pool: Pool): Promise<void> {
  for (const customer of customers) {
    await pool.query(
      'insert into public.customers (customer_id, name, tier, locale) values ($1, $2, $3, $4)',
      [customer.customerId, customer.name, customer.tier, customer.locale],
    );
  }
  await pool.query("select setval('public.customers_customer_id_seq', (select max(customer_id) from public.customers))");
}

async function insertTags(pool: Pool): Promise<void> {
  for (const tag of tags) {
    await pool.query('insert into public.ticket_tags (slug, label) values ($1, $2)', [tag.slug, tag.label]);
  }
}

async function insertTickets(pool: Pool): Promise<void> {
  const now = new Date();
  for (const ticket of tickets) {
    await pool.query(
      `insert into public.tickets (
        ticket_id, customer_id, subject, status, priority, language, channel,
        sla_due_at, created_at, updated_at, metadata
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{}'::jsonb)`,
      [
        ticket.ticketId,
        ticket.customerId,
        ticket.subject,
        ticket.status,
        ticket.priority,
        ticket.language,
        ticket.channel,
        ticket.slaOffsetHours === undefined ? null : offsetDate(now, ticket.slaOffsetHours),
        offsetDate(now, -ticket.createdOffsetHours),
        offsetDate(now, -ticket.updatedOffsetHours),
      ],
    );

    for (const tag of ticket.tags) {
      await pool.query(
        `insert into public.ticket_tag_links (ticket_id, tag_id)
         select $1, tag_id from public.ticket_tags where slug = $2`,
        [ticket.ticketId, tag],
      );
    }

    for (const message of ticket.messages) {
      await pool.query(
        `insert into public.ticket_messages (ticket_id, sender_name, sender_role, body, created_at)
         values ($1, $2, $3, $4, $5)`,
        [
          ticket.ticketId,
          message.senderName,
          message.senderRole,
          message.body,
          offsetDate(now, -message.createdOffsetHours),
        ],
      );
    }
  }
  await pool.query("select setval('public.tickets_ticket_id_seq', (select max(ticket_id) from public.tickets))");
}

function offsetDate(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 3_600_000);
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.ASHIBA_TEST_DB_HOST ?? 'localhost';
  const port = process.env.ASHIBA_TEST_DB_PORT ?? '5432';
  const name = process.env.ASHIBA_TEST_DB_NAME ?? 'ashiba';
  const user = process.env.ASHIBA_TEST_DB_USER ?? 'ashiba';
  const password = process.env.ASHIBA_TEST_DB_PASSWORD ?? 'ashiba';
  return `postgres://${user}:${password}@${host}:${port}/${name}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = new Pool({ connectionString: resolveDatabaseUrl() });
  try {
    await seedSupportInbox(pool);
  } finally {
    await pool.end();
  }
}
