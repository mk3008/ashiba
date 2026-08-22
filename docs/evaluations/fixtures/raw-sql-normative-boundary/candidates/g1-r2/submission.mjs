/*
 * The SQL strings below are the reviewable source assets for this candidate.
 * `execute` performs only the mechanical named-to-positional lowering; the
 * caller retains ownership of the client and any transaction.
 */

const SEARCH_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (:status IS NULL OR status = :status)
  AND (:owner IS NULL OR owner = :owner)
  AND (
    :needle IS NULL
    OR title ILIKE '%' || :needle || '%'
    OR note ILIKE '%' || :needle || '%'
  )
ORDER BY id
`;

const LIST_TITLE_ASC_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY title ASC, id ASC
`;

const LIST_TITLE_DESC_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY title DESC, id ASC
`;

const LIST_PRIORITY_ASC_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority ASC, id ASC
`;

const LIST_PRIORITY_DESC_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority DESC, id ASC
`;

const OPEN_ITEMS_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id
`;

const OWNED_ITEMS_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE owner = :owner
ORDER BY id
`;

const BINDING_EDGE_CASES_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (:note::text IS NULL OR note = :note::text)
  AND (:status::text IS NULL OR status = :status::text)
  AND 'literal :not_a_parameter' IS NOT NULL
-- comment :not_a_parameter
ORDER BY id
`;

const LIST_SQL_BY_SELECTION = Object.freeze({
  'title:asc': LIST_TITLE_ASC_SQL,
  'title:desc': LIST_TITLE_DESC_SQL,
  'priority:asc': LIST_PRIORITY_ASC_SQL,
  'priority:desc': LIST_PRIORITY_DESC_SQL,
});

/**
 * Lower canonical named parameters to PostgreSQL positional parameters.
 * Strings and comments are copied verbatim, so colons in either cannot bind.
 * Repeated names share one positional slot and one ordered value.
 */
function lowerNamedParameters(sql, input, parameterNames) {
  const values = [];
  const slots = new Map();
  const allowed = new Set(parameterNames);
  let positionalSql = '';
  let state = 'normal';

  const valueFor = (name) => {
    if (!allowed.has(name)) {
      throw new Error(`Unknown named parameter: ${name}`);
    }
    if (!slots.has(name)) {
      slots.set(name, values.length + 1);
      values.push(input?.[name] ?? null);
    }
    return `$${slots.get(name)}`;
  };

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (state === 'single') {
      positionalSql += ch;
      if (ch === "'" && next === "'") {
        positionalSql += next;
        i += 1;
      } else if (ch === "'") {
        state = 'normal';
      }
      continue;
    }
    if (state === 'double') {
      positionalSql += ch;
      if (ch === '"' && next === '"') {
        positionalSql += next;
        i += 1;
      } else if (ch === '"') {
        state = 'normal';
      }
      continue;
    }
    if (state === 'line-comment') {
      positionalSql += ch;
      if (ch === '\n') state = 'normal';
      continue;
    }
    if (state === 'block-comment') {
      positionalSql += ch;
      if (ch === '*' && next === '/') {
        positionalSql += next;
        i += 1;
        state = 'normal';
      }
      continue;
    }

    if (ch === "'") {
      positionalSql += ch;
      state = 'single';
      continue;
    }
    if (ch === '"') {
      positionalSql += ch;
      state = 'double';
      continue;
    }
    if (ch === '-' && next === '-') {
      positionalSql += ch + next;
      i += 1;
      state = 'line-comment';
      continue;
    }
    if (ch === '/' && next === '*') {
      positionalSql += ch + next;
      i += 1;
      state = 'block-comment';
      continue;
    }

    // A parameter starts at a single colon followed by an identifier.  The
    // preceding/following-colon checks preserve PostgreSQL's `::` casts.
    const identifierStart = /[A-Za-z_]/.test(ch);
    if (
      ch === ':' &&
      next !== ':' &&
      sql[i - 1] !== ':' &&
      /[A-Za-z_]/.test(next ?? '')
    ) {
      let end = i + 1;
      while (end < sql.length && /[A-Za-z0-9_]/.test(sql[end])) end += 1;
      const name = sql.slice(i + 1, end);
      positionalSql += valueFor(name);
      i = end - 1;
      continue;
    }
    // Keep this branch explicit: ordinary identifiers are source text, never
    // runtime SQL syntax.
    void identifierStart;
    positionalSql += ch;
  }

  return { text: positionalSql, values };
}

function run(sql, parameterNames, client, input = {}) {
  const lowered = lowerNamedParameters(sql, input, parameterNames);
  return client.query(lowered.text, lowered.values);
}

function record(sql, params, executor) {
  return Object.freeze({ sql, params: Object.freeze([...params]), execute: executor });
}

const searchRecord = record(SEARCH_SQL, ['status', 'owner', 'needle'], (client, input = {}) =>
  run(SEARCH_SQL, ['status', 'owner', 'needle'], client, input));

const listRecord = record(LIST_TITLE_ASC_SQL, [], (client, input = {}) => {
  const sort = input?.sort;
  const direction = input?.direction;
  if (sort !== 'title' && sort !== 'priority') {
    throw new Error(`Unsupported sort: ${String(sort)}`);
  }
  if (direction !== 'asc' && direction !== 'desc') {
    throw new Error(`Unsupported direction: ${String(direction)}`);
  }
  // Selection is finite and reviewed above; neither input is interpolated.
  return client.query(LIST_SQL_BY_SELECTION[`${sort}:${direction}`], []);
});

const openItemsRecord = record(OPEN_ITEMS_SQL, [], (client) =>
  run(OPEN_ITEMS_SQL, [], client));

const ownedItemsRecord = record(OWNED_ITEMS_SQL, ['owner'], (client, input = {}) =>
  run(OWNED_ITEMS_SQL, ['owner'], client, input));

const bindingEdgeCasesRecord = record(BINDING_EDGE_CASES_SQL, ['note', 'status'], (client, input = {}) =>
  run(BINDING_EDGE_CASES_SQL, ['note', 'status'], client, input));

export const queries = Object.freeze({
  search: searchRecord,
  list: listRecord,
  openItems: openItemsRecord,
  ownedItems: ownedItemsRecord,
  bindingEdgeCases: bindingEdgeCasesRecord,
});

// Named aliases keep the individual boundaries convenient to import while
// preserving the canonical query-record collection above.
export const search = searchRecord;
export const list = listRecord;
export const openItems = openItemsRecord;
export const ownedItems = ownedItemsRecord;
export const bindingEdgeCases = bindingEdgeCasesRecord;

export default queries;

export {
  SEARCH_SQL,
  LIST_TITLE_ASC_SQL,
  LIST_TITLE_DESC_SQL,
  LIST_PRIORITY_ASC_SQL,
  LIST_PRIORITY_DESC_SQL,
  OPEN_ITEMS_SQL,
  OWNED_ITEMS_SQL,
  BINDING_EDGE_CASES_SQL,
  lowerNamedParameters,
};
