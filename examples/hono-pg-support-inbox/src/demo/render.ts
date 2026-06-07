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
    </main>
    ${renderQueryConsole(filters, viewModel.inspection)}
  </div>
  <script>${consoleScript()}</script>
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

function renderQueryConsole(filters: TicketFilters, inspection: SupportInboxViewModel['inspection']): string {
  return `<aside class="queryConsole">
    <div class="consoleHeader">
      <div>
        <strong>Live Query Console</strong>
        <span>${escapeHtml(inspection.sqlPath)}</span>
      </div>
      <span class="liveBadge">LIVE</span>
    </div>
    <section class="consoleSection">
      <h2>リクエスト概要</h2>
      <div class="requestSummary">
        <div><span>endpoint</span><strong>GET /tickets</strong></div>
        <div><span>rows</span><strong>${inspection.rowCount} rows</strong></div>
        <div><span>elapsed</span><strong>${inspection.elapsedMs ?? '-'} ms</strong></div>
      </div>
    </section>
    <section class="consoleSection">
      <h2>現在のフィルター</h2>
      <div class="consoleChips">${renderFilterChips(filters)}</div>
      <h2>並び順</h2>
      <p class="sortLine">${escapeHtml(currentSortLabel(filters.sort))} <code>(${escapeHtml(inspection.safeSortKeys)})</code></p>
      <p class="stableLine">stable suffix <code>${escapeHtml(inspection.stableOrder)}</code></p>
    </section>
    <section class="consoleSection consoleGuide" data-console-guide>
      <div class="sectionTitleRow">
        <h2>説明</h2>
        <button type="button" data-dismiss-guide aria-label="説明を非表示">×</button>
      </div>
      <div class="guideBox">
        ${consoleGuideLines().map((line) => `<div class="guideLine">${escapeHtml(line)}</div>`).join('')}
      </div>
    </section>
    <section class="consoleSection">
      <h2>実行ログ</h2>
      <div class="executionLog">
        <div class="logLine">[now] GET /tickets -> ${inspection.rowCount} rows${inspection.elapsedMs === undefined ? '' : ` (${inspection.elapsedMs} ms)`} ok</div>
        <div class="logLine">[now] safe sort -> ${escapeHtml(inspection.safeSortKeys)}, ${escapeHtml(inspection.stableOrder)}</div>
        <div class="logLine">[now] bound names -> ${escapeHtml(inspection.orderedNames.join(', ') || '-')}</div>
      </div>
    </section>
    <section class="consoleSection sqlBlock">
      <h2>実行されたSQL</h2>
      <pre>${escapeHtml(inspection.compiledSql || 'SQL has not been captured yet.')}</pre>
    </section>
  </aside>`;
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

function renderFilterChips(filters: TicketFilters): string {
  const chips = [
    ['ステータス', filters.status ? statusLabel(filters.status) : copy.values.all],
    ['顧客ティア', filters.customerTier ? tierLabel(filters.customerTier) : copy.values.all],
    ['SLA状態', filters.slaState ? slaLabel(filters.slaState) : copy.values.all],
    ['言語', filters.language ? languageLabel(filters.language) : copy.values.all],
    ['チャネル', filters.channel ? channelLabel(filters.channel) : copy.values.all],
    ['タグ', filters.tag || copy.values.all],
    ['キーワード', filters.keyword || 'なし'],
  ];
  return chips.map(([label, value]) => `<span>${escapeHtml(label)}: ${escapeHtml(value)}</span>`).join('');
}

function consoleGuideLines(): string[] {
  const safeSortLines = sortOptions.map((option) => {
    const keys = ticketSortInputs[option.value]
      .map((item) => `${item.key} ${item.direction ?? 'asc'}`)
      .join(', ');
    return `${option.label}: ${keys}`;
  });
  return [
    copy.demoCards.routeTitle,
    ...copy.demoCards.routeBullets.map((item) => `- ${item}`),
    copy.demoCards.sortTitle,
    ...copy.demoCards.sortBullets.map((item) => `- ${item}`),
    copy.demoCards.safeSortSurfaceTitle,
    ...safeSortLines,
    `${copy.demoCards.stableSortLabel}: ticket_id asc`,
    copy.demoCards.note,
    copy.demoCards.valueTitle,
    ...copy.demoCards.valueBullets.map((item) => `- ${item}`),
  ];
}

function consoleScript(): string {
  return `
    (() => {
      const guide = document.querySelector('[data-console-guide]');
      if (!guide) return;
      if (localStorage.getItem('support-inbox-console-guide') === 'hidden') {
        guide.hidden = true;
      }
      document.querySelector('[data-dismiss-guide]')?.addEventListener('click', () => {
        guide.hidden = true;
        localStorage.setItem('support-inbox-console-guide', 'hidden');
      });
    })();
  `;
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
    .shell { display: grid; grid-template-columns: 190px minmax(0, 1fr) 390px; min-height: 100vh; }
    .sidebar { background: #ffffff; border-right: 1px solid #d8dee9; display: flex; flex-direction: column; padding: 18px 12px; }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
    .brandIcon { width: 24px; height: 24px; border-radius: 50%; display: inline-grid; place-items: center; background: #e8f2ff; color: #1459b8; font-weight: 700; }
    nav { display: grid; gap: 6px; }
    nav a { padding: 10px 12px; border-radius: 6px; color: #344054; font-weight: 600; }
    nav a.active, nav a:hover { background: #e9f2ff; color: #1459b8; }
    .version { margin-top: auto; color: #667085; font-size: 12px; }
    .workspace { padding: 18px; display: grid; grid-template-rows: auto auto minmax(360px, 1fr) minmax(280px, auto); gap: 12px; overflow: hidden; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: 24px; margin-bottom: 6px; }
    .toolbar p { color: #667085; margin-bottom: 0; }
    .profile { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: #e7e4ff; color: #4639b8; font-weight: 700; font-size: 12px; }
    .filters { display: grid; grid-template-columns: repeat(3, minmax(130px, 1fr)); gap: 10px; align-items: end; }
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
    .queryConsole { background: #0b1220; color: #d8e4f6; border-left: 1px solid #1c2b42; padding: 18px; display: grid; grid-template-rows: auto auto auto auto minmax(82px, auto) minmax(320px, 1fr); gap: 14px; min-height: 100vh; max-height: 100vh; overflow: auto; }
    .consoleHeader { display: flex; justify-content: space-between; gap: 14px; align-items: start; padding-bottom: 14px; border-bottom: 1px solid #1e2d44; }
    .consoleHeader div { display: grid; gap: 5px; min-width: 0; }
    .consoleHeader strong { color: #ffffff; font-size: 18px; }
    .consoleHeader span:not(.liveBadge) { color: #8ea3bf; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; overflow-wrap: anywhere; }
    .liveBadge { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 5px 9px; background: #063f2a; color: #7dffb0; font-size: 11px; font-weight: 900; letter-spacing: 0; }
    .liveBadge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 12px rgba(34, 197, 94, 0.8); }
    .consoleSection { display: grid; gap: 10px; min-width: 0; }
    .consoleSection h2 { margin: 0; color: #d8e4f6; font-size: 13px; }
    .sectionTitleRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .sectionTitleRow button { width: 24px; height: 24px; border: 1px solid #263850; border-radius: 6px; background: #111b2b; color: #8ea3bf; cursor: pointer; font-weight: 900; line-height: 1; }
    .sectionTitleRow button:hover { color: #ffffff; border-color: #3b5271; }
    .requestSummary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #263850; border-radius: 8px; background: #111b2b; }
    .requestSummary div { display: grid; gap: 6px; padding: 11px; border-right: 1px solid #263850; min-width: 0; }
    .requestSummary div:last-child { border-right: 0; }
    .requestSummary span { color: #8ea3bf; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .requestSummary strong { color: #ffffff; font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; overflow-wrap: anywhere; }
    .consoleChips { display: flex; flex-wrap: wrap; gap: 7px; }
    .consoleChips span, .sortLine, .stableLine { border: 1px solid #263850; background: #0f1a2b; border-radius: 6px; padding: 7px 9px; color: #d8e4f6; font-size: 12px; font-weight: 700; }
    .sortLine, .stableLine { margin: 0; line-height: 1.45; }
    .sortLine code, .stableLine code { color: #9bd2ff; font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; }
    .guideBox { max-height: 150px; overflow: auto; border: 1px solid #263850; border-radius: 8px; background: #0f1a2b; padding: 10px; display: grid; align-content: start; gap: 5px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; line-height: 1.45; }
    .executionLog { min-height: 76px; max-height: 120px; overflow: auto; border: 1px solid #263850; border-radius: 8px; background: #08111f; padding: 10px; display: grid; align-content: start; gap: 5px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; line-height: 1.45; }
    .guideLine { color: #8ea3bf; }
    .logLine { color: #67e8a5; }
    .sqlBlock { min-height: 0; }
    .sqlBlock pre { margin: 0; min-height: 300px; max-height: calc(100vh - 560px); overflow: auto; border-radius: 8px; border: 1px solid #263850; padding: 12px; background: #050b15; color: #b9d7ff; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; line-height: 1.45; white-space: pre; }
    .errorPage { max-width: 760px; margin: 80px auto; background: #fff; border: 1px solid #d8dee9; border-radius: 8px; padding: 24px; }
    .errorPage pre { white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; }
  `;
}
