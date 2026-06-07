import type { GetTicketDetailQueryResult } from '#features/support-inbox/queries/get-ticket-detail/query.js';
import type { ListTicketsQueryResult } from '#features/support-inbox/queries/list-tickets/query.js';
import {
  ticketColumnSortInputs,
  type TicketColumnSortKey,
  type TicketFilters,
  type TicketSortKey,
  type TicketSortValue,
} from '../request/tickets.request.js';
import { copy } from './tickets.copy.js';
import type { SupportInboxViewModel } from './tickets.presenter.js';

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

const columnSortLabels: Record<TicketColumnSortKey, string> = {
  ticket_id: 'ID',
  subject: '件名',
  customer_name: '顧客',
  customer_tier: 'ティア',
  status: 'ステータス',
  priority_rank: '優先度',
  sla_due_at: 'SLA期限',
  sla_state: 'SLA状態',
  latest_message_at: '最新メッセージ',
  language: '言語',
  channel: 'チャネル',
  updated_at: '更新日時',
};

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
        </div>
      </section>
      ${renderFilterForm(filters)}
      ${renderTicketTable(filters, viewModel)}
      ${renderDetail(viewModel.selectedTicket?.summary, viewModel.selectedTicket?.messages ?? [])}
    </main>
    ${renderQueryConsole(filters, viewModel.inspection)}
  </div>
  ${renderSortScript()}
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
    <div class="brand"><img class="brandIcon" src="/assets/ashiba-icon.jpg" alt="Ashiba"><strong>${copy.appName}</strong></div>
    <nav>
      <a class="navRoot active" href="/tickets">受信箱</a>
      <div class="navChildren" aria-label="受信箱のショートカット">
        <a href="/tickets?status=waiting_agent">マイチケット</a>
        <a href="/tickets?status=draft">下書き</a>
      </div>
    </nav>
    <div class="version">Demo v0.1.0</div>
  </aside>`;
}

function renderFilterForm(filters: TicketFilters): string {
  return `<section class="searchControls">
    <form class="filters" action="/tickets" method="get">
      ${filters.sort ? `<input type="hidden" name="sort" value="${escapeHtml(filters.sort)}">` : ''}
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
      <div class="actions">
        <a class="button secondary" href="/tickets">${copy.reset}</a>
        <button class="button primary" type="submit">${copy.search}</button>
      </div>
    </form>
    <form class="sortForm" action="/tickets" method="get">
      ${hiddenSearchInputs(filters)}
      <label class="sortField">
        <span>${copy.filters.sort}:</span>
        <select name="sort" onchange="this.form.submit()">
          <option value=""${filters.sort === '' ? ' selected' : ''}></option>
          ${sortOptions.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === filters.sort ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
        </select>
      </label>
    </form>
  </section>`;
}

function renderTicketTable(filters: TicketFilters, viewModel: SupportInboxViewModel): string {
  const { tickets, pagination } = viewModel;
  const rows = tickets.map((ticket) => renderTicketRow(filters, ticket)).join('');
  return `<section id="ticket-list" class="panel listPanel">
    <div class="panelHeader">
      <strong>${pagination.totalCount}件のチケット</strong>
      <span>${pagination.page} / ${pagination.totalPages}ページ・表示 ${tickets.length}件・並び順: ${escapeHtml(currentSortLabel(filters.sort))}</span>
    </div>
    <div class="tableScroll">
      <table>
        <thead>
          <tr>
            ${sortHeader(filters, 'ticket_id')}
            ${sortHeader(filters, 'subject')}
            ${sortHeader(filters, 'customer_name')}
            ${sortHeader(filters, 'customer_tier')}
            ${sortHeader(filters, 'status')}
            ${sortHeader(filters, 'priority_rank')}
            ${sortHeader(filters, 'sla_due_at')}
            ${sortHeader(filters, 'sla_state')}
            ${sortHeader(filters, 'latest_message_at')}
            ${sortHeader(filters, 'language')}
            ${sortHeader(filters, 'channel')}
            ${sortHeader(filters, 'updated_at')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${renderPagination(filters, pagination)}
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
    return `<section id="ticket-detail" class="panel detailPanel"><p>表示するチケットがありません。</p></section>`;
  }
  return `<section id="ticket-detail" class="panel detailPanel">
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

function renderQueryConsole(_filters: TicketFilters, inspection: SupportInboxViewModel['inspection']): string {
  return `<aside class="queryConsole">
    <div class="consoleHeader">
      <div>
        <strong>Live Query Console</strong>
        <span>${escapeHtml(inspection.sqlPath)}</span>
      </div>
      <span class="liveBadge">LIVE</span>
    </div>
    <section class="sqlPanel">
      ${renderBoundParams(inspection.boundParams)}
      <pre>${escapeHtml(inspection.compiledSql || 'SQL has not been captured yet.')}</pre>
    </section>
  </aside>`;
}

function renderBoundParams(params: SupportInboxViewModel['inspection']['boundParams']): string {
  if (params.length === 0) {
    return `<div class="paramsPanel"><p>bound parameters are empty.</p></div>`;
  }
  return `<div class="paramsPanel">
    <table>
      <thead><tr><th>placeholder</th><th>name</th><th>value</th></tr></thead>
      <tbody>${params.map((param) => `<tr><td>${escapeHtml(param.placeholder)}</td><td>${escapeHtml(param.name)}</td><td>${escapeHtml(formatParamValue(param.value))}</td></tr>`).join('')}</tbody>
    </table>
  </div>`;
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
      params.set(key, String(value));
    }
  }
  if (ticketId !== null) {
    params.set('ticketId', ticketId.toString());
  }
  return `/tickets?${params.toString()}#ticket-detail`;
}

function renderPagination(filters: TicketFilters, pagination: SupportInboxViewModel['pagination']): string {
  if (pagination.totalPages <= 1) {
    return '';
  }
  const previous = pagination.hasPrevious
    ? `<a class="pageButton" href="${pageHref(filters, pagination.page - 1)}">前へ</a>`
    : `<span class="pageButton disabled">前へ</span>`;
  const next = pagination.hasNext
    ? `<a class="pageButton" href="${pageHref(filters, pagination.page + 1)}">次へ</a>`
    : `<span class="pageButton disabled">次へ</span>`;
  return `<div class="pagination">
    ${previous}
    <span>${pagination.page} / ${pagination.totalPages}</span>
    ${next}
  </div>`;
}

function pageHref(filters: TicketFilters, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key !== 'selectedTicketId' && key !== 'page' && value) {
      params.set(key, String(value));
    }
  }
  if (page > 1) {
    params.set('page', page.toString());
  }
  return `/tickets?${params.toString()}#ticket-list`;
}

function hiddenSearchInputs(filters: TicketFilters): string {
  const entries = [
    ['status', filters.status],
    ['customerTier', filters.customerTier],
    ['slaState', filters.slaState],
    ['language', filters.language],
    ['channel', filters.channel],
    ['tag', filters.tag],
    ['keyword', filters.keyword],
  ];
  return entries
    .filter(([, value]) => value)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join('');
}

function currentSortLabel(sort: TicketSortValue): string {
  const preset = sortOptions.find((option) => option.value === sort);
  if (preset) {
    return preset.label;
  }
  const columnSort = parseColumnSortValue(sort);
  if (columnSort.length === 0) {
    return '未指定';
  }
  return columnSort.map((item) => `${columnSortLabels[item.key]} ${item.direction === 'desc' ? '降順' : '昇順'}`).join(' → ');
}

function sortHeader(filters: TicketFilters, key: TicketColumnSortKey): string {
  const active = parseColumnSortValue(filters.sort);
  const index = active.findIndex((item) => item.key === key);
  const activeItem = index >= 0 ? active[index] : undefined;
  const marker = activeItem ? `<span class="sortMarker">${activeItem.direction === 'desc' ? '↓' : '↑'}${index > 0 ? index + 1 : ''}</span>` : '';
  return `<th><a class="sortHeader" href="${sortHref(filters, key)}" data-sort-key="${escapeHtml(key)}">${escapeHtml(columnSortLabels[key])}${marker}</a></th>`;
}

function sortHref(filters: TicketFilters, key: TicketColumnSortKey): string {
  const active = parseColumnSortValue(filters.sort);
  const first = active[0];
  const direction = first?.key === key && first.direction === 'asc' ? 'desc' : 'asc';
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (name !== 'sort' && name !== 'page' && name !== 'selectedTicketId' && value) {
      params.set(name, String(value));
    }
  }
  params.set('sort', `${key}.${direction}`);
  return `/tickets?${params.toString()}#ticket-list`;
}

function parseColumnSortValue(sort: TicketSortValue): Array<{ key: TicketColumnSortKey; direction: 'asc' | 'desc' }> {
  const validKeys = new Set(Object.keys(ticketColumnSortInputs));
  return sort
    .split(',')
    .map((part) => {
      const [key, direction] = part.split('.');
      return { key, direction };
    })
    .filter((item): item is { key: TicketColumnSortKey; direction: 'asc' | 'desc' } =>
      validKeys.has(item.key ?? '') && (item.direction === 'asc' || item.direction === 'desc'),
    );
}

function renderSortScript(): string {
  return `<script>
(() => {
  const sortableKeys = new Set(${JSON.stringify(Object.keys(ticketColumnSortInputs))});
  const workspace = document.querySelector('.workspace');
  const scrollToHashTarget = () => {
    if (!workspace || !window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
  };
  window.addEventListener('hashchange', scrollToHashTarget);
  scrollToHashTarget();
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('.sortHeader') : null;
    if (!target || !event.shiftKey) return;
    event.preventDefault();
    const key = target.getAttribute('data-sort-key');
    if (!key || !sortableKeys.has(key)) return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get('sort') || '';
    const items = current.split(',').map((part) => {
      const [itemKey, direction] = part.split('.');
      return { key: itemKey, direction };
    }).filter((item) => sortableKeys.has(item.key) && (item.direction === 'asc' || item.direction === 'desc'));
    const existing = items.find((item) => item.key === key);
    if (existing) {
      existing.direction = existing.direction === 'asc' ? 'desc' : 'asc';
    } else {
      items.push({ key, direction: 'asc' });
    }
    const next = items.slice(0, 4).map((item) => item.key + '.' + item.direction).join(',');
    if (next) {
      params.set('sort', next);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    params.delete('ticketId');
    window.location.href = '/tickets?' + params.toString() + '#ticket-list';
  });
})();
</script>`;
}

function text(value: unknown): string {
  return value === null || value === undefined ? '-' : String(value);
}

function formatParamValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value === '' ? '""' : value;
  }
  return String(value);
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
    html, body { height: 100%; overflow: hidden; }
    .shell { display: grid; grid-template-columns: 180px minmax(0, 1fr) 470px; height: 100vh; overflow: hidden; }
    .sidebar { background: #ffffff; border-right: 1px solid #d8dee9; display: flex; flex-direction: column; padding: 18px 12px; height: 100vh; overflow: hidden; }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
    .brandIcon { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex: 0 0 auto; display: block; border: 1px solid #d8dee9; background: #ffffff; }
    nav { display: grid; gap: 6px; }
    nav a { padding: 10px 12px; border-radius: 6px; color: #344054; font-weight: 600; }
    nav a.active, nav a:hover { background: #e9f2ff; color: #1459b8; }
    .navRoot { font-weight: 800; }
    .navChildren { display: grid; gap: 3px; margin-left: 14px; padding-left: 12px; border-left: 2px solid #d8dee9; }
    .navChildren a { padding: 8px 10px; color: #475467; font-size: 13px; }
    .version { margin-top: auto; color: #667085; font-size: 12px; }
    .workspace { padding: 18px; display: flex; flex-direction: column; gap: 12px; height: 100vh; min-height: 0; overflow-y: scroll; overflow-x: hidden; scrollbar-gutter: stable; }
    .workspace > * { flex-shrink: 0; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: 24px; margin-bottom: 0; }
    .toolbar p { color: #667085; margin-bottom: 0; }
    .searchControls { display: grid; gap: 10px; }
    .filters { display: grid; grid-template-columns: repeat(3, minmax(130px, 1fr)); gap: 10px; align-items: end; }
    .field { display: grid; gap: 6px; min-width: 0; }
    .field span { color: #475467; font-size: 12px; font-weight: 700; }
    select, input { width: 100%; min-height: 36px; border: 1px solid #cfd7e6; border-radius: 6px; padding: 7px 10px; color: #17202f; background: #fff; }
    .keyword { grid-column: span 2; }
    .actions { display: flex; gap: 8px; }
    .sortForm { display: flex; justify-content: flex-end; }
    .sortField { display: flex; align-items: center; gap: 8px; color: #475467; font-size: 12px; font-weight: 700; }
    .sortField select { width: 240px; }
    .button { min-height: 36px; border-radius: 6px; border: 1px solid #cfd7e6; padding: 8px 14px; font-weight: 700; cursor: pointer; }
    .button.primary { background: #1459b8; color: #fff; border-color: #1459b8; }
    .button.secondary { background: #fff; color: #344054; }
    .panel { background: #fff; border: 1px solid #d8dee9; border-radius: 8px; box-shadow: 0 8px 24px rgba(20, 40, 80, 0.05); min-width: 0; overflow: hidden; }
    .listPanel { display: block; }
    .panelHeader { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; color: #475467; }
    .panelHeader strong { color: #17202f; }
    .tableScroll { overflow-x: auto; overflow-y: visible; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px 16px; border-top: 1px solid #edf0f5; color: #475467; font-weight: 700; }
    .pageButton { min-width: 58px; border: 1px solid #cfd7e6; border-radius: 6px; padding: 7px 10px; color: #1459b8; background: #fff; text-align: center; }
    .pageButton.disabled { color: #98a2b3; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 11px 12px; border-top: 1px solid #edf0f5; text-align: left; white-space: nowrap; vertical-align: top; }
    th { color: #667085; font-size: 12px; background: #fbfcfe; }
    .sortHeader { display: inline-flex; align-items: center; gap: 4px; color: inherit; font-weight: 800; }
    .sortHeader:hover { color: #1459b8; }
    .sortMarker { color: #1459b8; font-size: 11px; }
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
    .queryConsole { background: #0b1220; color: #d8e4f6; border-left: 1px solid #1c2b42; padding: 18px; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 14px; height: 100vh; min-height: 0; overflow: hidden; }
    .consoleHeader { display: flex; justify-content: space-between; gap: 14px; align-items: start; padding-bottom: 14px; border-bottom: 1px solid #1e2d44; }
    .consoleHeader div { display: grid; gap: 5px; min-width: 0; }
    .consoleHeader strong { color: #ffffff; font-size: 18px; }
    .consoleHeader span:not(.liveBadge) { color: #8ea3bf; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .liveBadge { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 5px 9px; background: #063f2a; color: #7dffb0; font-size: 11px; font-weight: 900; letter-spacing: 0; }
    .liveBadge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 12px rgba(34, 197, 94, 0.8); }
    .sqlPanel { min-height: 0; display: grid; gap: 10px; grid-template-rows: auto minmax(0, 1fr); }
    .paramsPanel { border: 1px solid #263850; border-radius: 8px; background: #08111f; overflow: auto; max-height: 180px; }
    .paramsPanel p { margin: 0; padding: 10px 12px; color: #8ea3bf; }
    .paramsPanel table { width: auto; min-width: 0; border-collapse: collapse; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; }
    .paramsPanel th, .paramsPanel td { padding: 7px 9px; border-top: 1px solid #1f2d42; color: #d8e4f6; text-align: left; vertical-align: top; }
    .paramsPanel th:nth-child(1), .paramsPanel td:nth-child(1) { min-width: 54px; }
    .paramsPanel th:nth-child(2), .paramsPanel td:nth-child(2) { min-width: 76px; }
    .paramsPanel th:nth-child(3), .paramsPanel td:nth-child(3) { min-width: 64px; }
    .paramsPanel th { color: #8ea3bf; background: #0f1a2b; }
    .sqlPanel pre { margin: 0; min-height: 0; overflow: auto; border-radius: 8px; border: 1px solid #263850; padding: 12px; background: #050b15; color: #b9d7ff; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; line-height: 1.45; white-space: pre; }
    .errorPage { max-width: 760px; margin: 80px auto; background: #fff; border: 1px solid #d8dee9; border-radius: 8px; padding: 24px; }
    .errorPage pre { white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; }
  `;
}
