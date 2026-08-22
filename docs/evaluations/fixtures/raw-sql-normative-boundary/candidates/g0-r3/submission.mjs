/*
 * The SQL below is kept in named-parameter form as the reviewable source of
 * truth.  bindNamedSql performs the small, lexical named-to-positional
 * conversion once while this module is loaded; values are never interpolated
 * into SQL text.
 */
function bindNamedSql(source) {
  const positions = new Map();
  const values = [];
  let output = '';
  let index = 0;
  let state = 'sql';

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (state === 'sql') {
      if (character === "'") {
        state = 'single-quote';
        output += character;
        index += 1;
        continue;
      }
      if (character === '"') {
        state = 'double-quote';
        output += character;
        index += 1;
        continue;
      }
      if (character === '-' && next === '-') {
        state = 'line-comment';
        output += '--';
        index += 2;
        continue;
      }
      if (character === '/' && next === '*') {
        state = 'block-comment';
        output += '/*';
        index += 2;
        continue;
      }
      if (
        character === ':' &&
        next !== ':' &&
        source[index - 1] !== ':' &&
        /[A-Za-z_]/.test(next ?? '')
      ) {
        let end = index + 1;
        while (end < source.length && /[A-Za-z0-9_]/.test(source[end])) end += 1;
        const name = source.slice(index + 1, end);
        let position = positions.get(name);
        if (position === undefined) {
          position = values.length + 1;
          positions.set(name, position);
          values.push(name);
        }
        output += `$${position}`;
        index = end;
        continue;
      }
      output += character;
      index += 1;
      continue;
    }

    output += character;
    index += 1;

    if (state === 'single-quote') {
      if (character === "'" && next === "'") {
        output += next;
        index += 1;
      } else if (character === "'") {
        state = 'sql';
      }
    } else if (state === 'double-quote') {
      if (character === '"' && next === '"') {
        output += next;
        index += 1;
      } else if (character === '"') {
        state = 'sql';
      }
    } else if (state === 'line-comment' && character === '\n') {
      state = 'sql';
    } else if (state === 'block-comment' && character === '*' && next === '/') {
      output += next;
      index += 1;
      state = 'sql';
    }
  }

  return { text: output, names: values };
}

function valuesFor(names, input) {
  return names.map((name) => input?.[name]);
}

const SEARCH_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (cast(:status AS text) IS NULL OR status = cast(:status AS text))
  AND (cast(:owner AS text) IS NULL OR owner = cast(:owner AS text))
  AND (cast(:needle AS text) IS NULL
       OR title ILIKE '%' || cast(:needle AS text) || '%')
ORDER BY id ASC
`;

const LIST_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY
  CASE WHEN cast(:sort AS text) = 'title'
             AND cast(:direction AS text) = 'asc'  THEN title END ASC,
  CASE WHEN cast(:sort AS text) = 'title'
             AND cast(:direction AS text) = 'desc' THEN title END DESC,
  CASE WHEN cast(:sort AS text) = 'priority'
             AND cast(:direction AS text) = 'asc'  THEN priority END ASC,
  CASE WHEN cast(:sort AS text) = 'priority'
             AND cast(:direction AS text) = 'desc' THEN priority END DESC,
  id ASC
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
WHERE owner = cast(:owner AS text)
ORDER BY id ASC
`;

const BINDING_EDGE_CASES_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE note = :note::text
  AND note = :note::text
  AND status = :status::text
  AND status = :status::text
  AND 'literal :not_a_parameter' IS NOT NULL
  -- comment :not_a_parameter
ORDER BY id ASC
`;

const bound = {
  search: bindNamedSql(SEARCH_SQL),
  list: bindNamedSql(LIST_SQL),
  ownedItems: bindNamedSql(OWNED_ITEMS_SQL),
  bindingEdgeCases: bindNamedSql(BINDING_EDGE_CASES_SQL),
};

export const queries = {
  search: {
    sql: SEARCH_SQL,
    async execute(client, input) {
      return (await client.query(bound.search.text, valuesFor(bound.search.names, input))).rows;
    },
  },

  list: {
    sql: LIST_SQL,
    async execute(client, input) {
      const sort = input?.sort;
      const direction = input?.direction;
      if ((sort !== 'title' && sort !== 'priority') || (direction !== 'asc' && direction !== 'desc')) {
        throw new TypeError('sort and direction must be from the reviewed finite set');
      }
      return (await client.query(bound.list.text, valuesFor(bound.list.names, input))).rows;
    },
  },

  openItems: {
    sql: OPEN_ITEMS_SQL,
    async execute(client) {
      return (await client.query(OPEN_ITEMS_SQL, [])).rows;
    },
  },

  ownedItems: {
    sql: OWNED_ITEMS_SQL,
    async execute(client, input) {
      return (await client.query(bound.ownedItems.text, valuesFor(bound.ownedItems.names, input))).rows;
    },
  },

  bindingEdgeCases: {
    sql: BINDING_EDGE_CASES_SQL,
    async execute(client, input) {
      return (await client.query(bound.bindingEdgeCases.text, valuesFor(bound.bindingEdgeCases.names, input))).rows;
    },
  },
};
