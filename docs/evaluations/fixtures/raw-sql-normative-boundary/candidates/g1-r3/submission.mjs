const searchSql = `
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

const listSql = Object.freeze({
  "title:asc": `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY title ASC, id ASC
`,
  "title:desc": `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY title DESC, id ASC
`,
  "priority:asc": `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority ASC, id ASC
`,
  "priority:desc": `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY priority DESC, id ASC
`,
});

const openItemsSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id ASC
`;

const ownedItemsSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE owner = :owner
ORDER BY id ASC
`;

const bindingEdgeCasesSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE note = :note::text
  AND status = :status::text
  AND status = :status::text
  AND 'literal :not_a_parameter' IS NOT NULL -- comment :not_a_parameter
ORDER BY id ASC
`;

export const queries = {
  search: {
    sql: searchSql,
    async execute(client, input) {
      const result = await client.query(
        `
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
`,
        [input.status, input.owner, input.needle],
      );
      return result.rows;
    },
  },
  list: {
    sql: listSql,
    async execute(client, input) {
      const key = `${input.sort}:${input.direction}`;
      if (!Object.prototype.hasOwnProperty.call(listSql, key)) {
        throw new Error('Unsupported sort or direction');
      }
      const result = await client.query(listSql[key], []);
      return result.rows;
    },
  },
  openItems: {
    sql: openItemsSql,
    async execute(client) {
      const result = await client.query(`
SELECT id, title, status, priority, owner, note
FROM items
WHERE status = 'open'
ORDER BY id ASC
`);
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
WHERE owner = $1
ORDER BY id ASC
`,
        [input.owner],
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
  AND status = $2::text
  AND status = $2::text
  AND 'literal :not_a_parameter' IS NOT NULL -- comment :not_a_parameter
ORDER BY id ASC
`,
        [input.note, input.status],
      );
      return result.rows;
    },
  },
};
