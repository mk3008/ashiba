const SEARCH_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (cast(:status as text) IS NULL OR status = cast(:status as text))
  AND (cast(:owner as text) IS NULL OR owner = cast(:owner as text))
  AND (
    cast(:needle as text) IS NULL
    OR title ILIKE '%' || cast(:needle as text) || '%'
    OR note ILIKE '%' || cast(:needle as text) || '%'
  )
ORDER BY id ASC
`;

const SEARCH_POSITIONAL_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (cast($1 as text) IS NULL OR status = cast($1 as text))
  AND (cast($2 as text) IS NULL OR owner = cast($2 as text))
  AND (
    cast($3 as text) IS NULL
    OR title ILIKE '%' || cast($3 as text) || '%'
    OR note ILIKE '%' || cast($3 as text) || '%'
  )
ORDER BY id ASC
`;

const LIST_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY
  CASE WHEN cast(:sort as text) = 'title' AND cast(:direction as text) = 'asc' THEN title END ASC,
  CASE WHEN cast(:sort as text) = 'title' AND cast(:direction as text) = 'desc' THEN title END DESC,
  CASE WHEN cast(:sort as text) = 'priority' AND cast(:direction as text) = 'asc' THEN priority END ASC,
  CASE WHEN cast(:sort as text) = 'priority' AND cast(:direction as text) = 'desc' THEN priority END DESC,
  id ASC
`;

const LIST_POSITIONAL_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY
  CASE WHEN cast($1 as text) = 'title' AND cast($2 as text) = 'asc' THEN title END ASC,
  CASE WHEN cast($1 as text) = 'title' AND cast($2 as text) = 'desc' THEN title END DESC,
  CASE WHEN cast($1 as text) = 'priority' AND cast($2 as text) = 'asc' THEN priority END ASC,
  CASE WHEN cast($1 as text) = 'priority' AND cast($2 as text) = 'desc' THEN priority END DESC,
  id ASC
`;

const OPEN_ITEMS_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id ASC
`;

const OPEN_ITEMS_POSITIONAL_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id ASC
`;

const OWNED_ITEMS_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE owner = cast(:owner as text)
ORDER BY id ASC
`;

const OWNED_ITEMS_POSITIONAL_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE owner = cast($1 as text)
ORDER BY id ASC
`;

const BINDING_EDGE_CASES_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE note = :note::text
  AND note = :note::text
  AND status = :status::text
  AND 'literal :not_a_parameter' IS NOT NULL
  /* comment :not_a_parameter */
ORDER BY id ASC
`;

const BINDING_EDGE_CASES_POSITIONAL_SQL = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE note = $1::text
  AND note = $1::text
  AND status = $2::text
  AND 'literal :not_a_parameter' IS NOT NULL
  /* comment :not_a_parameter */
ORDER BY id ASC
`;

export const queries = {
  search: {
    sql: SEARCH_SQL,
    params: ['status', 'owner', 'needle'],
    async execute(client, input = {}) {
      const { status = null, owner = null, needle = null } = input;
      return (await client.query(SEARCH_POSITIONAL_SQL, [status, owner, needle])).rows;
    },
  },
  list: {
    sql: LIST_SQL,
    params: ['sort', 'direction'],
    async execute(client, input = {}) {
      const { sort, direction } = input;
      if ((sort !== 'title' && sort !== 'priority') || (direction !== 'asc' && direction !== 'desc')) {
        throw new TypeError('sort and direction must be selected from the reviewed finite set');
      }
      return (await client.query(LIST_POSITIONAL_SQL, [sort, direction])).rows;
    },
  },
  openItems: {
    sql: OPEN_ITEMS_SQL,
    params: [],
    async execute(client) {
      return (await client.query(OPEN_ITEMS_POSITIONAL_SQL, [])).rows;
    },
  },
  ownedItems: {
    sql: OWNED_ITEMS_SQL,
    params: ['owner'],
    async execute(client, input = {}) {
      const { owner } = input;
      return (await client.query(OWNED_ITEMS_POSITIONAL_SQL, [owner])).rows;
    },
  },
  bindingEdgeCases: {
    sql: BINDING_EDGE_CASES_SQL,
    params: ['note', 'status'],
    async execute(client, input = {}) {
      const { note, status } = input;
      return (await client.query(BINDING_EDGE_CASES_POSITIONAL_SQL, [note, status])).rows;
    },
  },
};
