/**
 * PostgreSQL query boundaries for the raw-sql normative-boundary fixture.
 *
 * The SQL is kept as named-parameter source.  `execute` performs the small
 * boundary translation to PostgreSQL positional parameters and delegates
 * execution to the supplied client.
 */

const IDENTIFIER_START = /[A-Za-z_]/;
const IDENTIFIER_CONTINUATION = /[A-Za-z0-9_]/;

/**
 * Replace named parameters with PostgreSQL placeholders while preserving
 * casts, quoted strings, and comments. Repeated names share one value.
 */
export function bindNamedParameters(sql, values = {}) {
  const indexes = new Map();
  const orderedValues = [];
  let output = '';
  let index = 0;
  let state = 'code';

  const addParameter = (name) => {
    let parameterIndex = indexes.get(name);
    if (parameterIndex === undefined) {
      parameterIndex = orderedValues.length + 1;
      indexes.set(name, parameterIndex);
      orderedValues.push(values[name]);
    }
    output += `$${parameterIndex}`;
  };

  while (index < sql.length) {
    const current = sql[index];
    const next = sql[index + 1];

    if (state === 'single-quote') {
      output += current;
      if (current === "'" && next === "'") {
        output += next;
        index += 2;
        continue;
      }
      if (current === "'") state = 'code';
      index += 1;
      continue;
    }

    if (state === 'double-quote') {
      output += current;
      if (current === '"' && next === '"') {
        output += next;
        index += 2;
        continue;
      }
      if (current === '"') state = 'code';
      index += 1;
      continue;
    }

    if (state === 'line-comment') {
      output += current;
      if (current === '\n' || current === '\r') state = 'code';
      index += 1;
      continue;
    }

    if (state === 'block-comment') {
      output += current;
      if (current === '*' && next === '/') {
        output += next;
        index += 2;
        state = 'code';
        continue;
      }
      index += 1;
      continue;
    }

    if (current === "'") {
      output += current;
      state = 'single-quote';
      index += 1;
      continue;
    }
    if (current === '"') {
      output += current;
      state = 'double-quote';
      index += 1;
      continue;
    }
    if (current === '-' && next === '-') {
      output += '--';
      index += 2;
      state = 'line-comment';
      continue;
    }
    if (current === '/' && next === '*') {
      output += '/*';
      index += 2;
      state = 'block-comment';
      continue;
    }

    // A PostgreSQL cast begins with `::`; the second colon is not a bind.
    if (
      current === ':' &&
      sql[index - 1] !== ':' &&
      next !== ':' &&
      IDENTIFIER_START.test(sql[index + 1] ?? '')
    ) {
      let end = index + 2;
      while (end < sql.length && IDENTIFIER_CONTINUATION.test(sql[end])) end += 1;
      addParameter(sql.slice(index + 1, end));
      index = end;
      continue;
    }

    output += current;
    index += 1;
  }

  return { text: output, values: orderedValues };
}

async function executeNamed(client, sql, values) {
  const bound = bindNamedParameters(sql, values);
  const result = await client.query(bound.text, bound.values);
  return result.rows;
}

const SEARCH_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (:status IS NULL OR status = :status)
  AND (:owner IS NULL OR owner = :owner)
  AND (:needle IS NULL OR title ILIKE '%' || :needle || '%')
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
ORDER BY title DESC, id DESC
`;
const LIST_PRIORITY_ASC_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority ASC, id ASC
`;
const LIST_PRIORITY_DESC_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority DESC, id DESC
`;

const LIST_SQL = Object.freeze({
  title: Object.freeze({ asc: LIST_TITLE_ASC_SQL, desc: LIST_TITLE_DESC_SQL }),
  priority: Object.freeze({ asc: LIST_PRIORITY_ASC_SQL, desc: LIST_PRIORITY_DESC_SQL }),
});

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
WHERE (note = :note::text OR note = :note::text)
  AND (status = :status::text OR status = :status::text)
  AND ':not_a_parameter' <> ''
-- :not_a_parameter
ORDER BY id
`;

export const queries = Object.freeze({
  search: {
    sql: SEARCH_SQL,
    params: ['status', 'owner', 'needle'],
    execute: (client, input = {}) => executeNamed(client, SEARCH_SQL, {
      status: input.status ?? null,
      owner: input.owner ?? null,
      needle: input.needle ?? null,
    }),
  },

  list: {
    // The default source asset is also a complete, executable query.
    sql: LIST_TITLE_ASC_SQL,
    params: [],
    execute: (client, input = {}) => {
      if (input.sort !== 'title' && input.sort !== 'priority') {
        throw new RangeError('sort must be title or priority');
      }
      const sortSql = LIST_SQL[input.sort];
      if (input.direction !== 'asc' && input.direction !== 'desc') {
        throw new RangeError('direction must be asc or desc');
      }
      const selectedSql = sortSql[input.direction];
      return executeNamed(client, selectedSql, {});
    },
  },

  openItems: {
    sql: OPEN_ITEMS_SQL,
    params: [],
    execute: (client) => executeNamed(client, OPEN_ITEMS_SQL, {}),
  },

  ownedItems: {
    sql: OWNED_ITEMS_SQL,
    params: ['owner'],
    execute: (client, input = {}) => executeNamed(client, OWNED_ITEMS_SQL, {
      owner: input.owner,
    }),
  },

  bindingEdgeCases: {
    sql: BINDING_EDGE_CASES_SQL,
    params: ['note', 'status'],
    execute: (client, input = {}) => executeNamed(client, BINDING_EDGE_CASES_SQL, {
      note: input.note,
      status: input.status,
    }),
  },
});
