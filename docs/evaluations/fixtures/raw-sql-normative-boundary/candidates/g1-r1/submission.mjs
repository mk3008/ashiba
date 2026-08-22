/*
 * The SQL strings in this file are the reviewable source assets.  The small
 * binder below is deliberately lexical: it does not alter quoted strings,
 * comments, or PostgreSQL casts while lowering named parameters for `pg`.
 */

const SEARCH_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (:status IS NULL OR status = :status)
  AND (:owner IS NULL OR owner = :owner)
  AND (:needle IS NULL OR title ILIKE '%' || :needle || '%')
ORDER BY id ASC
`;

const OPEN_ITEMS_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id ASC
`;

const OWNED_ITEMS_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE owner = :owner
ORDER BY id ASC
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

const LIST_SQL = Object.freeze({
  title: Object.freeze({ asc: LIST_TITLE_ASC_SQL, desc: LIST_TITLE_DESC_SQL }),
  priority: Object.freeze({ asc: LIST_PRIORITY_ASC_SQL, desc: LIST_PRIORITY_DESC_SQL }),
});

const BINDING_EDGE_CASES_SQL = `
SELECT
  :note::text AS note_value,
  :note::text AS repeated_note_value,
  :status::text AS status_value,
  'literal :not_a_parameter'::text AS literal_value
/* comment :not_a_parameter */
`;

const SEARCH_PARAMS = Object.freeze(['status', 'owner', 'needle']);
const OWNED_ITEMS_PARAMS = Object.freeze(['owner']);
const BINDING_EDGE_CASES_PARAMS = Object.freeze(['note', 'status']);
const NO_PARAMS = Object.freeze([]);

function isIdentifierStart(character) {
  return /[A-Za-z_]/.test(character ?? '');
}

function isIdentifierPart(character) {
  return /[A-Za-z0-9_]/.test(character ?? '');
}

/**
 * Lower named placeholders to PostgreSQL positional placeholders without
 * treating casts, literals, or comments as parameter references.
 */
function bindNamed(sql, parameterNames, input) {
  const positions = new Map(parameterNames.map((name, index) => [name, index + 1]));
  const values = parameterNames.map((name) => input?.[name] ?? null);
  const output = [];
  let index = 0;
  let state = 'code';

  while (index < sql.length) {
    const character = sql[index];
    const next = sql[index + 1];

    if (state === 'single-quote') {
      output.push(character);
      if (character === "'" && next === "'") {
        output.push(next);
        index += 2;
      } else {
        if (character === "'") state = 'code';
        index += 1;
      }
      continue;
    }

    if (state === 'line-comment') {
      output.push(character);
      index += 1;
      if (character === '\n' || character === '\r') state = 'code';
      continue;
    }

    if (state === 'block-comment') {
      output.push(character);
      if (character === '*' && next === '/') {
        output.push(next);
        index += 2;
        state = 'code';
      } else {
        index += 1;
      }
      continue;
    }

    if (character === "'") {
      output.push(character);
      state = 'single-quote';
      index += 1;
      continue;
    }
    if (character === '-' && next === '-') {
      output.push(character, next);
      state = 'line-comment';
      index += 2;
      continue;
    }
    if (character === '/' && next === '*') {
      output.push(character, next);
      state = 'block-comment';
      index += 2;
      continue;
    }

    if (character === ':' && next !== ':' && sql[index - 1] !== ':' && isIdentifierStart(next)) {
      let end = index + 2;
      while (isIdentifierPart(sql[end])) end += 1;
      const name = sql.slice(index + 1, end);
      const position = positions.get(name);
      if (!position) throw new Error(`Unknown named parameter: ${name}`);
      output.push(`$${position}`);
      index = end;
      continue;
    }

    output.push(character);
    index += 1;
  }

  return { text: output.join(''), values };
}

function executeNamed(client, sql, parameterNames, input = {}) {
  const bound = bindNamed(sql, parameterNames, input);
  return client.query(bound.text, bound.values);
}

function executeStatic(sql, parameterNames, client, input) {
  return executeNamed(client, sql, parameterNames, input);
}

const search = Object.freeze({
  name: 'search',
  sql: SEARCH_SQL,
  params: SEARCH_PARAMS,
  execute(client, input = {}) {
    return executeStatic(SEARCH_SQL, SEARCH_PARAMS, client, input);
  },
});

const list = Object.freeze({
  name: 'list',
  // This is the default complete asset; all reviewed alternatives are in
  // LIST_SQL and selected by finite keys below.
  sql: LIST_TITLE_ASC_SQL,
  params: NO_PARAMS,
  sqlBySortAndDirection: LIST_SQL,
  execute(client, input = {}) {
    const sort = input.sort;
    const direction = input.direction;
    const byDirection = LIST_SQL[sort];
    const selectedSql = Object.hasOwn(LIST_SQL, sort) && Object.hasOwn(byDirection, direction)
      ? byDirection[direction]
      : undefined;
    if (!selectedSql) {
      throw new RangeError('sort and direction must be reviewed finite choices');
    }
    return executeStatic(selectedSql, NO_PARAMS, client, input);
  },
});

const openItems = Object.freeze({
  name: 'openItems',
  sql: OPEN_ITEMS_SQL,
  params: NO_PARAMS,
  execute(client, input = {}) {
    return executeStatic(OPEN_ITEMS_SQL, NO_PARAMS, client, input);
  },
});

const ownedItems = Object.freeze({
  name: 'ownedItems',
  sql: OWNED_ITEMS_SQL,
  params: OWNED_ITEMS_PARAMS,
  execute(client, input = {}) {
    return executeStatic(OWNED_ITEMS_SQL, OWNED_ITEMS_PARAMS, client, input);
  },
});

const bindingEdgeCases = Object.freeze({
  name: 'bindingEdgeCases',
  sql: BINDING_EDGE_CASES_SQL,
  params: BINDING_EDGE_CASES_PARAMS,
  execute(client, input = {}) {
    return executeStatic(BINDING_EDGE_CASES_SQL, BINDING_EDGE_CASES_PARAMS, client, input);
  },
});

export { bindingEdgeCases, list, openItems, ownedItems, search };
export const queries = Object.freeze([search, list, openItems, ownedItems, bindingEdgeCases]);
