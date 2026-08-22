const searchSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE (cast(:status AS text) IS NULL OR status = cast(:status AS text))
  AND (cast(:owner AS text) IS NULL OR owner = cast(:owner AS text))
  AND (cast(:needle AS text) IS NULL
       OR title ILIKE '%' || cast(:needle AS text) || '%')
ORDER BY id;
`.trim();

const listSql = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY
  CASE WHEN cast(:sort AS text) = 'title'
             AND cast(:direction AS text) = 'asc' THEN title END ASC NULLS LAST,
  CASE WHEN cast(:sort AS text) = 'title'
             AND cast(:direction AS text) = 'desc' THEN title END DESC NULLS LAST,
  CASE WHEN cast(:sort AS text) = 'priority'
             AND cast(:direction AS text) = 'asc' THEN priority END ASC NULLS LAST,
  CASE WHEN cast(:sort AS text) = 'priority'
             AND cast(:direction AS text) = 'desc' THEN priority END DESC NULLS LAST,
  id ASC;
`.trim();

const openItemsSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id;
`.trim();

const ownedItemsSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE owner = cast(:owner AS text)
ORDER BY id;
`.trim();

const bindingEdgeCasesSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE note = :note::text
  AND note = :note::text
  AND status = :status::text
  AND status = :status::text
  AND 'literal :not_a_parameter' = 'literal :not_a_parameter'
/* :not_a_parameter */
ORDER BY id;
`.trim();

export const queries = {
  search: {
    sql: searchSql,
    async execute(client, input) {
      const { status = null, owner = null, needle = null } = input ?? {};
      const result = await client.query(
        `
SELECT id, title, status, priority, owner, note
FROM items
WHERE ($1::text IS NULL OR status = $1::text)
  AND ($2::text IS NULL OR owner = $2::text)
  AND ($3::text IS NULL OR title ILIKE '%' || $3::text || '%')
ORDER BY id;
`.trim(),
        [status, owner, needle],
      );
      return result.rows;
    },
  },

  list: {
    sql: listSql,
    async execute(client, input) {
      const { sort, direction } = input ?? {};
      if ((sort !== 'title' && sort !== 'priority') ||
          (direction !== 'asc' && direction !== 'desc')) {
        throw new TypeError('sort and direction must be from the reviewed finite set');
      }
      const result = await client.query(
        `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY
  CASE WHEN $1::text = 'title' AND $2::text = 'asc' THEN title END ASC NULLS LAST,
  CASE WHEN $1::text = 'title' AND $2::text = 'desc' THEN title END DESC NULLS LAST,
  CASE WHEN $1::text = 'priority' AND $2::text = 'asc' THEN priority END ASC NULLS LAST,
  CASE WHEN $1::text = 'priority' AND $2::text = 'desc' THEN priority END DESC NULLS LAST,
  id ASC;
`.trim(),
        [sort, direction],
      );
      return result.rows;
    },
  },

  openItems: {
    sql: openItemsSql,
    async execute(client, _input) {
      const result = await client.query(
        `
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id;
`.trim(),
        [],
      );
      return result.rows;
    },
  },

  ownedItems: {
    sql: ownedItemsSql,
    async execute(client, input) {
      const result = await client.query(
        `
SELECT id, title, status, priority, owner, note
FROM items
WHERE owner = $1::text
ORDER BY id;
`.trim(),
        [input?.owner],
      );
      return result.rows;
    },
  },

  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    async execute(client, input) {
      const result = await client.query(
        `
SELECT id, title, status, priority, owner, note
FROM items
WHERE note = $1::text
  AND note = $1::text
  AND status = $2::text
  AND status = $2::text
  AND 'literal :not_a_parameter' = 'literal :not_a_parameter'
/* :not_a_parameter */
ORDER BY id;
`.trim(),
        [input?.note, input?.status],
      );
      return result.rows;
    },
  },
};
