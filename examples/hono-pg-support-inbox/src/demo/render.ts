import type { GetTicketDetailQueryResult } from '#features/support-inbox/queries/get-ticket-detail/query.js';
import type { ListTicketsQueryResult } from '#features/support-inbox/queries/list-tickets/query.js';
import { copy } from './copy.js';
import type { SupportInboxViewModel } from './service.js';
import { ticketSortInputs, type TicketFilters, type TicketSortKey } from './request.js';

type Option = {
  value: string;
  label: string;
};

const statusOptions: Option[] = [
  { value: '', label: copy.values.all },
  { value: 'open', label: copy.values.open },
  { value: 'waiting_customer', label: copy.values.waitingCustomer },
  { value: 'waiting_agent', label: copy.values.waitingAgent },
  { value: 'resolved', label: copy.values.resolved },
  { value: 'draft', label: copy.values.draft },
];

const customerTierOptions: Option[] = [
  { value: '', label: copy.values.all },
  { value: 'vip', label: copy.values.vip },
  { value: 'standard', label: copy.values.standard },
];

const slaOptions: Option[] = [
  { value: '', label: copy.values.all },
  { value: 'breached', label: copy.values.breached },
  { value: 'warning', label: copy.values.warning },
  { value: 'ok', label: copy.values.ok },
  { value: 'none', label: copy.values.none },
];

const languageOptions: Option[] = [
  { value: '', label: copy.values.all },
  { value: 'ja', label: copy.values.ja },
  { value: 'en', label: copy.values.en },
];

const channelOptions: Option[] = [
  { value: '', label: copy.values.all },
  { value: 'email', label: copy.values.email },
  { value: 'chat', label: copy.values.chat },
  { value: 'web', label: copy.values.web },
];

const tagOptions: Option[] = [
  { value: '', label: copy.values.all },
  { value: 'billing', label: 'billing' },
  { value: 'login', label: 'login' },
  { value: 'api', label: 'api' },
  { value: 'docs', label: 'docs' },
  { value: 'plan', label: 'plan' },
];

const sortOptions: Array<Option & { value: TicketSortKey }> = [
  { value: 'action-required', label: copy.sortLabels.actionRequired },
  { value: 'priority-high', label: copy.sortLabels.priorityHigh },
  { value: 'sla-soon', label: copy.sortLabels.slaSoon },
  { value: 'customer-reply-new', label: copy.sortLabels.customerReplyNew },
  { value: 'updated-new', label: copy.sortLabels.updatedNew },
  { value: 'vip-first', label: copy.sortLabels.vipFirst },
];

export function renderSupportInbox(filters: TicketFilters, viewModel: SupportInboxViewModel): string {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${copy.appName}</title>
  <style>${styles()}</style>
</head>
<body>
  <div class="shell">
    ${renderSidebar()}
    <main class="workspace">
      <section class="toolbar">
        <div>
          <h1>${copy.inbox}</h1>
          <p>${copy.tickets}</p>
        </div>
        <div class="profile">A9</div>
      </section>
      ${renderFilterForm(filters)}
      ${renderTicketTable(filters, viewModel.tickets)}
      ${renderDetail(viewModel.selectedTicket?.summary, viewModel.selectedTicket?.messages ?? [])}
      ${renderSqlInspection(viewModel.inspection)}
    </main>
    ${renderDemoRail()}
  </div>
</body>
</html>`;
}

export function renderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${copy.appName}</title>
  <style>${styles()}</style>
</head>
<body>
  <div class="errorPage">
    <h1>Demo is not ready</h1>
    <p>PostgreSQL is not reachable or the seed data has not been loaded.</p>
    <pre>${escapeHtml(message)}</pre>
  </div>
</body>
</html>`;
}

function renderSidebar(): string {
  return `<aside class="sidebar">
    <div class="brand"><span class="brandIcon">S</span><strong>${copy.appName}</strong></div>
    <nav>
      <a class="active" href="/tickets">受信箱</a>
      <a href="/tickets?status=waiting_agent">マイチケット</a>
      <a href="/tickets?status=draft">下書き</a>
      <a href="/tickets?slaState=breached">レポート</a>
      <a href="/tickets?tag=billing">設定</a>
    </nav>
    <div class="version">Demo v0.1.0</div>
  </aside>`;
}

function renderFilterForm(filters: TicketFilters): string {
  return `<form class="filters" action="/tickets" method="get">
    ${select('status', copy.filters.status, statusOptions, filters.status)}
    ${select('customerTier', copy.filters.customerTier, customerTierOptions, filters.customerTier)}
    ${select('slaState', copy.filters.slaState, slaOptions, filters.slaState)}
    ${select('language', copy.filters.language, languageOptions, filters.language)}
    ${select('channel', copy.filters.channel, channelOptions, filters.channel)}
    ${select('tag', copy.filters.tag, tagOptions, filters.tag)}
    <label class="field keyword">
      <span>${copy.filters.keyword}</span>
      <input type="search" name="keyword" value="${escapeHtml(filters.keyword)}" placeholder="件名・顧客・メッセージを検索">
    </label>
    ${select('sort', copy.filters.sort, sortOptions, filters.sort)}
    <div class="actions">
      <a class="button secondary" href="/tickets">${copy.reset}</a>
      <button class="button primary" type="submit">${copy.search}</button>
    </div>
  </form>`;
}

function renderTicketTable(filters: TicketFilters, tickets: ListTicketsQueryResult[]): string {
  const rows = tickets.map((ticket) => renderTicketRow(filters, ticket)).join('');
  return `<section class="panel listPanel">
    <div class="panelHeader">
      <strong>${tickets.length}件のチケット</strong>
      <span>並び順: ${escapeHtml(currentSortLabel(filters.sort))}</span>
    </div>
    <div class="tableScroll">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>件名</th>
            <th>顧客</th>
            <th>ティア</th>
            <th>ステータス</th>
            <th>優先度</th>
            <th>SLA期限</th>
            <th>SLA状態</th>
            <th>最新メッセージ</th>
            <th>言語</th>
            <th>チャネル</th>
            <th>更新日時</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>`;
}

function renderTicketRow(filters: TicketFilters, ticket: ListTicketsQueryResult): string {
  const href = withTicketId(filters, ticket.ticket_id);
  const selected = filters.selectedTicketId === ticket.ticket_id?.toString() ? ' selected' : '';
  return `<tr class="${selected}">
    <td>#${ticket.ticket_id ?? '-'}</td>
    <td><a href="${href}">${escapeHtml(text(ticket.subject))}</a></td>
    <td>${escapeHtml(text(ticket.customer_name))}</td>
    <td>${badge(text(ticket.customer_tier), `tier ${ticket.customer_tier ?? ''}`)}</td>
    <td>${badge(statusLabel(ticket.status), `status ${ticket.status ?? ''}`)}</td>
    <td>${badge(priorityLabel(ticket.priority), `priority ${ticket.priority ?? ''}`)}</td>
    <td>${formatDate(ticket.sla_due_at)}</td>
    <td>${badge(slaLabel(ticket.sla_state), `sla ${ticket.sla_state ?? ''}`)}</td>
    <td class="message"><strong>${escapeHtml(text(ticket.latest_sender_name))}</strong><span>${escapeHtml(text(ticket.latest_message_body))}</span></td>
    <td>${languageLabel(ticket.language)}</td>
    <td>${channelLabel(ticket.channel)}</td>
    <td>${formatRelative(ticket.updated_at)}</td>
  </tr>`;
}

function renderDetail(summary: GetTicketDetailQueryResult | undefined, messages: GetTicketDetailQueryResult[]): string {
  if (!summary) {
    return `<section class="panel detailPanel"><p>表示するチケットがありません。</p></section>`;
  }
  return `<section class="panel detailPanel">
    <div class="ticketSummary">
      <a href="/tickets">← 戻る</a>
      <h2>チケット #${summary.ticket_id ?? '-'}</h2>
      <p>${escapeHtml(text(summary.subject))}</p>
      <dl>
        <div><dt>顧客</dt><dd>${escapeHtml(text(summary.customer_name))} (${tierLabel(summary.customer_tier)})</dd></div>
        <div><dt>ステータス</dt><dd>${statusLabel(summary.status)}</dd></div>
        <div><dt>優先度</dt><dd>${priorityLabel(summary.priority)}</dd></div>
        <div><dt>SLA期限</dt><dd>${formatDate(summary.sla_due_at)}</dd></div>
        <div><dt>言語</dt><dd>${languageLabel(summary.language)}</dd></div>
        <div><dt>チャネル</dt><dd>${channelLabel(summary.channel)}</dd></div>
        <div><dt>更新日時</dt><dd>${formatDate(summary.updated_at)}</dd></div>
      </dl>
    </div>
    <div class="messages">
      <h3>メッセージ履歴</h3>
      ${messages.map(renderMessage).join('')}
      <form class="replyBox">
        <input disabled placeholder="メッセージを入力...">
        <button disabled>送信</button>
      </form>
    </div>
  </section>`;
}

function renderSqlInspection(inspection: SupportInboxViewModel['inspection']): string {
  return `<section class="panel sqlPanel">
    <div class="panelHeader">
      <strong>SQL inspection</strong>
      <span>${escapeHtml(inspection.sqlPath)}</span>
    </div>
    <div class="sqlConsole">
      <div class="sqlMeta">
        <div><span>selected sort</span><code>${escapeHtml(inspection.selectedSort)}</code></div>
        <div><span>safe sort keys</span><code>${escapeHtml(inspection.safeSortKeys)}</code></div>
        <div><span>stable suffix</span><code>${escapeHtml(inspection.stableOrder)}</code></div>
        <div><span>bound names</span><code>${escapeHtml(inspection.orderedNames.join(', ') || '-')}</code></div>
      </div>
      <pre>${escapeHtml(inspection.compiledSql || 'SQL has not been captured yet.')}</pre>
    </div>
  </section>`;
}

function renderMessage(message: GetTicketDetailQueryResult): string {
  return `<article class="messageCard">
    <div>
      <strong>${escapeHtml(text(message.sender_name))}</strong>
      <span>${senderRoleLabel(message.sender_role)}</span>
      <time>${formatDate(message.message_created_at)}</time>
    </div>
    <p>${escapeHtml(text(message.message_body))}</p>
  </article>`;
}

function renderDemoRail(): string {
  return `<aside class="demoRail">
    ${demoCard(copy.demoCards.routeTitle, copy.demoCards.routeBullets)}
    ${demoCard(copy.demoCards.sortTitle, copy.demoCards.sortBullets)}
    ${renderSafeSortSurface()}
    <div class="note">${copy.demoCards.note}</div>
    ${demoCard(copy.demoCards.valueTitle, copy.demoCards.valueBullets, 'value')}
  </aside>`;
}

function renderSafeSortSurface(): string {
  const rows = sortOptions.map((option) => {
    const keys = ticketSortInputs[option.value]
      .map((item) => `${item.key} ${item.direction ?? 'asc'}`)
      .join(', ');
    return `<div><dt>${escapeHtml(option.label)}</dt><dd>${escapeHtml(keys)}</dd></div>`;
  }).join('');
  return `<section class="demoCard sortSurface">
    <h2>${copy.demoCards.safeSortSurfaceTitle}</h2>
    <dl>${rows}<div><dt>${copy.demoCards.stableSortLabel}</dt><dd>ticket_id asc</dd></div></dl>
  </section>`;
}

function demoCard(title: string, bullets: readonly string[], className = ''): string {
  return `<section class="demoCard ${className}">
    <h2>${escapeHtml(title)}</h2>
    <ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  </section>`;
}

function select(name: string, label: string, options: readonly Option[], current: string): string {
  return `<label class="field">
    <span>${escapeHtml(label)}</span>
    <select name="${escapeHtml(name)}">
      ${options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === current ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
    </select>
  </label>`;
}

function badge(label: string, className: string): string {
  return `<span class="badge ${escapeHtml(className)}">${escapeHtml(label)}</span>`;
}

function withTicketId(filters: TicketFilters, ticketId: number | null): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key !== 'selectedTicketId' && value) {
      params.set(key, value);
    }
  }
  if (ticketId !== null) {
    params.set('ticketId', ticketId.toString());
  }
  return `/tickets?${params.toString()}`;
}

function currentSortLabel(sort: TicketSortKey): string {
  return sortOptions.find((option) => option.value === sort)?.label ?? copy.sortLabels.actionRequired;
}

function text(value: unknown): string {
  return value === null || value === undefined ? '-' : String(value);
}

function formatDate(value: unknown): string {
  if (!value) {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelative(value: unknown): string {
  if (!value) {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(String(value));
  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / 3_600_000));
  if (hours < 24) {
    return `${hours}時間前`;
  }
  return `${Math.round(hours / 24)}日前`;
}

function statusLabel(value: unknown): string {
  switch (value) {
    case 'open':
      return copy.values.open;
    case 'waiting_customer':
      return copy.values.waitingCustomer;
    case 'waiting_agent':
      return copy.values.waitingAgent;
    case 'resolved':
      return copy.values.resolved;
    case 'draft':
      return copy.values.draft;
    default:
      return '-';
  }
}

function priorityLabel(value: unknown): string {
  switch (value) {
    case 'high':
      return copy.values.high;
    case 'medium':
      return copy.values.medium;
    case 'low':
      return copy.values.low;
    default:
      return '-';
  }
}

function slaLabel(value: unknown): string {
  switch (value) {
    case 'breached':
      return copy.values.breached;
    case 'warning':
      return copy.values.warning;
    case 'ok':
      return copy.values.ok;
    case 'none':
      return copy.values.none;
    default:
      return '-';
  }
}

function tierLabel(value: unknown): string {
  return value === 'vip' ? copy.values.vip : copy.values.standard;
}

function languageLabel(value: unknown): string {
  return value === 'en' ? copy.values.en : copy.values.ja;
}

function channelLabel(value: unknown): string {
  switch (value) {
    case 'email':
      return copy.values.email;
    case 'chat':
      return copy.values.chat;
    case 'web':
      return copy.values.web;
    default:
      return '-';
  }
}

function senderRoleLabel(value: unknown): string {
  switch (value) {
    case 'customer':
      return '顧客';
    case 'agent':
      return 'エージェント';
    default:
      return 'システム';
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function styles(): string {
  return `
    :root {
      color-scheme: light;
      font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: #17202f;
      background: #f5f7fb;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 1120px; }
    a { color: #1459b8; text-decoration: none; }
    .shell { display: grid; grid-template-columns: 210px minmax(0, 1fr) 320px; min-height: 100vh; }
    .sidebar { background: #ffffff; border-right: 1px solid #d8dee9; display: flex; flex-direction: column; padding: 18px 12px; }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
    .brandIcon { width: 24px; height: 24px; border-radius: 50%; display: inline-grid; place-items: center; background: #e8f2ff; color: #1459b8; font-weight: 700; }
    nav { display: grid; gap: 6px; }
    nav a { padding: 10px 12px; border-radius: 6px; color: #344054; font-weight: 600; }
    nav a.active, nav a:hover { background: #e9f2ff; color: #1459b8; }
    .version { margin-top: auto; color: #667085; font-size: 12px; }
    .workspace { padding: 18px; display: grid; grid-template-rows: auto auto minmax(360px, 1fr) minmax(260px, auto) minmax(260px, auto); gap: 12px; overflow: hidden; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: 24px; margin-bottom: 6px; }
    .toolbar p { color: #667085; margin-bottom: 0; }
    .profile { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: #e7e4ff; color: #4639b8; font-weight: 700; font-size: 12px; }
    .filters { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); gap: 10px; align-items: end; }
    .field { display: grid; gap: 6px; min-width: 0; }
    .field span { color: #475467; font-size: 12px; font-weight: 700; }
    select, input { width: 100%; min-height: 36px; border: 1px solid #cfd7e6; border-radius: 6px; padding: 7px 10px; color: #17202f; background: #fff; }
    .keyword { grid-column: span 2; }
    .actions { display: flex; gap: 8px; }
    .button { min-height: 36px; border-radius: 6px; border: 1px solid #cfd7e6; padding: 8px 14px; font-weight: 700; cursor: pointer; }
    .button.primary { background: #1459b8; color: #fff; border-color: #1459b8; }
    .button.secondary { background: #fff; color: #344054; }
    .panel { background: #fff; border: 1px solid #d8dee9; border-radius: 8px; box-shadow: 0 8px 24px rgba(20, 40, 80, 0.05); min-width: 0; overflow: hidden; }
    .panelHeader { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; color: #475467; }
    .panelHeader strong { color: #17202f; }
    .tableScroll { overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 11px 12px; border-top: 1px solid #edf0f5; text-align: left; white-space: nowrap; vertical-align: top; }
    th { color: #667085; font-size: 12px; background: #fbfcfe; }
    tr.selected { background: #f2f7ff; }
    .message { display: grid; gap: 4px; min-width: 220px; white-space: normal; }
    .message span { color: #475467; line-height: 1.35; }
    .badge { display: inline-flex; align-items: center; min-height: 22px; border-radius: 999px; padding: 3px 8px; font-size: 12px; font-weight: 700; background: #eef2f7; color: #344054; }
    .tier.vip { background: #eee7ff; color: #6236a5; }
    .status.open, .status.waiting_agent { background: #e8f2ff; color: #1459b8; }
    .status.waiting_customer { background: #e6f7f1; color: #057a55; }
    .status.resolved { background: #e8f8ed; color: #067647; }
    .priority.high, .sla.breached { background: #ffe8ec; color: #c01435; }
    .priority.medium, .sla.warning { background: #fff1d6; color: #946200; }
    .priority.low, .sla.ok { background: #e8f8ed; color: #067647; }
    .detailPanel { display: grid; grid-template-columns: 310px 1fr; min-height: 280px; }
    .ticketSummary { border-right: 1px solid #edf0f5; padding: 18px; }
    .ticketSummary h2 { margin: 14px 0 8px; font-size: 20px; }
    dl { display: grid; gap: 10px; margin: 20px 0 0; }
    dl div { display: grid; grid-template-columns: 90px 1fr; gap: 12px; }
    dt { color: #667085; font-weight: 700; }
    dd { margin: 0; }
    .messages { padding: 18px; display: grid; gap: 12px; align-content: start; }
    .messageCard { border: 1px solid #edf0f5; border-radius: 8px; padding: 12px; background: #fff; }
    .messageCard div { display: flex; gap: 10px; align-items: center; color: #667085; font-size: 12px; }
    .messageCard p { margin: 8px 0 0; line-height: 1.6; }
    .replyBox { display: grid; grid-template-columns: 1fr 72px; gap: 8px; }
    .replyBox button { border: 0; border-radius: 6px; background: #1459b8; color: #fff; font-weight: 700; }
    .demoRail { padding: 20px 18px; display: grid; gap: 16px; align-content: start; }
    .demoCard, .note { border-radius: 8px; padding: 18px; background: #fff; border: 1px solid #e0e6f0; }
    .demoCard h2 { font-size: 20px; margin-bottom: 12px; color: #3b2d8f; }
    .demoCard ul { padding-left: 20px; margin: 0; display: grid; gap: 10px; line-height: 1.65; font-weight: 650; }
    .note { background: #e6f4ff; color: #075985; font-weight: 700; line-height: 1.6; }
    .demoCard.value { background: #eef8ef; }
    .demoCard.value h2 { color: #16803c; }
    .sortSurface dl { display: grid; gap: 10px; margin: 0; }
    .sortSurface div { display: grid; gap: 4px; }
    .sortSurface dt { color: #344054; font-weight: 800; font-size: 12px; }
    .sortSurface dd { margin: 0; color: #475467; font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
    .sqlPanel { min-height: 260px; }
    .sqlConsole { display: grid; grid-template-rows: auto minmax(160px, 1fr); gap: 12px; padding: 0 16px 16px; }
    .sqlMeta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .sqlMeta div { display: grid; gap: 5px; min-width: 0; padding: 10px; border: 1px solid #edf0f5; border-radius: 6px; background: #fbfcfe; }
    .sqlMeta span { color: #667085; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .sqlMeta code { color: #17202f; font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sqlConsole pre { margin: 0; max-height: 280px; overflow: auto; border-radius: 6px; padding: 14px; background: #101828; color: #d1e9ff; font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; line-height: 1.55; white-space: pre; }
    .errorPage { max-width: 760px; margin: 80px auto; background: #fff; border: 1px solid #d8dee9; border-radius: 8px; padding: 24px; }
    .errorPage pre { white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; }
  `;
}
