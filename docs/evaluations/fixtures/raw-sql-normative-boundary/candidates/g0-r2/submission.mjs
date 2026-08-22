/**
 * Self-contained query boundary submission for the frozen fixture.
 *
 * The exported SQL uses :name placeholders.  execute() translates those
 * placeholders to PostgreSQL's positional form while leaving strings and
 * comments untouched.
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
  AND ':not_a_parameter' = ':not_a_parameter' -- :not_a_parameter
ORDER BY id
`;

// Each variant is a complete, reviewed SQL asset.  User input is used only
// to select one of these keys; it is never interpolated into SQL.
const LIST_SQL = Object.freeze({
  'title:asc': `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY title ASC, id ASC
`,
  'title:desc': `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY title DESC, id ASC
`,
  'priority:asc': `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority ASC, id ASC
`,
  'priority:desc': `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority DESC, id ASC
`,
});

const LIST_SQL_BY_SORT = Object.freeze({
  title: Object.freeze({
    asc: LIST_SQL['title:asc'],
    desc: LIST_SQL['title:desc'],
  }),
  priority: Object.freeze({
    asc: LIST_SQL['priority:asc'],
    desc: LIST_SQL['priority:desc'],
  }),
});

/**
 * Convert named parameters to pg's positional parameters.
 *
 * A placeholder is recognized only in ordinary SQL text.  Quoted strings,
 * quoted identifiers, line comments, block comments, and PostgreSQL dollar
 * quoted strings are copied verbatim.  Repeated names deliberately produce
 * repeated positional values, preserving occurrence order.
 */
function bindNamed(sql, input = {}) {
  const values = [];
  let positional = '';
  let i = 0;
  let state = 'code';
  let dollarTag = '';

  const valueFor = (name) => {
    if (!Object.prototype.hasOwnProperty.call(input, name)) {
      throw new TypeError(`Missing query parameter: ${name}`);
    }
    values.push(input[name]);
    return `$${values.length}`;
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (state === 'line-comment') {
      positional += ch;
      i += 1;
      if (ch === '\n' || ch === '\r') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      positional += ch;
      if (ch === '*' && next === '/') {
        positional += next;
        i += 2;
        state = 'code';
      } else {
        i += 1;
      }
      continue;
    }
    if (state === 'single-quote') {
      positional += ch;
      if (ch === "'" && next === "'") {
        positional += next;
        i += 2;
      } else if (ch === "'") {
        i += 1;
        state = 'code';
      } else {
        i += 1;
      }
      continue;
    }
    if (state === 'double-quote') {
      positional += ch;
      if (ch === '"' && next === '"') {
        positional += next;
        i += 2;
      } else if (ch === '"') {
        i += 1;
        state = 'code';
      } else {
        i += 1;
      }
      continue;
    }
    if (state === 'dollar-quote') {
      if (sql.startsWith(dollarTag, i)) {
        positional += dollarTag;
        i += dollarTag.length;
        state = 'code';
      } else {
        positional += ch;
        i += 1;
      }
      continue;
    }

    if (ch === '-' && next === '-') {
      positional += '--';
      i += 2;
      state = 'line-comment';
      continue;
    }
    if (ch === '/' && next === '*') {
      positional += '/*';
      i += 2;
      state = 'block-comment';
      continue;
    }
    if (ch === "'") {
      positional += ch;
      i += 1;
      state = 'single-quote';
      continue;
    }
    if (ch === '"') {
      positional += ch;
      i += 1;
      state = 'double-quote';
      continue;
    }
    if (ch === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        positional += dollarTag;
        i += dollarTag.length;
        state = 'dollar-quote';
        continue;
      }
    }
    if (ch === ':' && next !== ':' && /[A-Za-z_]/.test(sql[i + 1] ?? '')) {
      let end = i + 2;
      while (end < sql.length && /[A-Za-z0-9_]/.test(sql[end])) end += 1;
      const name = sql.slice(i + 1, end);
      positional += valueFor(name);
      i = end;
      continue;
    }

    positional += ch;
    i += 1;
  }

  return { text: positional, values };
}

function run(sql, input, client) {
  const bound = bindNamed(sql, input);
  return client.query(bound.text, bound.values);
}

const searchQuery = {
  name: 'search',
  sql: SEARCH_SQL,
  params: ['status', 'owner', 'needle'],
  execute(client, input = {}) {
    return run(SEARCH_SQL, input, client);
  },
};

const listQuery = {
  name: 'list',
  sql: LIST_SQL['title:asc'],
  params: ['sort', 'direction'],
  execute(client, input = {}) {
    const { sort, direction } = input;
    if (sort !== 'title' && sort !== 'priority') {
      throw new TypeError('Invalid sort; expected title or priority');
    }
    if (direction !== 'asc' && direction !== 'desc') {
      throw new TypeError('Invalid direction; expected asc or desc');
    }
    return client.query(LIST_SQL_BY_SORT[sort][direction], []);
  },
};

const openItemsQuery = {
  name: 'openItems',
  sql: OPEN_ITEMS_SQL,
  params: [],
  execute(client) {
    return client.query(OPEN_ITEMS_SQL, []);
  },
};

const ownedItemsQuery = {
  name: 'ownedItems',
  sql: OWNED_ITEMS_SQL,
  params: ['owner'],
  execute(client, input = {}) {
    return run(OWNED_ITEMS_SQL, input, client);
  },
};

const bindingEdgeCasesQuery = {
  name: 'bindingEdgeCases',
  sql: BINDING_EDGE_CASES_SQL,
  params: ['note', 'status'],
  execute(client, input = {}) {
    return run(BINDING_EDGE_CASES_SQL, input, client);
  },
};

export const queries = [
  searchQuery,
  listQuery,
  openItemsQuery,
  ownedItemsQuery,
  bindingEdgeCasesQuery,
];

export {
  SEARCH_SQL,
  LIST_SQL,
  LIST_SQL_BY_SORT,
  OPEN_ITEMS_SQL,
  OWNED_ITEMS_SQL,
  BINDING_EDGE_CASES_SQL,
  bindNamed,
  searchQuery,
  listQuery,
  openItemsQuery,
  ownedItemsQuery,
  bindingEdgeCasesQuery,
};
