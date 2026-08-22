/*
 * The named statements below are the reviewable source assets.  The pg
 * driver receives the corresponding positional statements explicitly in
 * each execution boundary.
 */

const searchSql = `
SELECT *
FROM items
WHERE (cast(:status AS text) IS NULL OR status = cast(:status AS text))
  AND (cast(:owner AS text) IS NULL OR owner = cast(:owner AS text))
  AND (cast(:needle AS text) IS NULL
       OR title ILIKE '%' || cast(:needle AS text) || '%')
ORDER BY id
`;

const searchPositionalSql = `
SELECT *
FROM items
WHERE (cast($1 AS text) IS NULL OR status = cast($1 AS text))
  AND (cast($2 AS text) IS NULL OR owner = cast($2 AS text))
  AND (cast($3 AS text) IS NULL
       OR title ILIKE '%' || cast($3 AS text) || '%')
ORDER BY id
`;

const listSql = Object.freeze({
  titleAsc: `SELECT * FROM items ORDER BY title ASC, id ASC`,
  titleDesc: `SELECT * FROM items ORDER BY title DESC, id ASC`,
  priorityAsc: `SELECT * FROM items ORDER BY priority ASC, id ASC`,
  priorityDesc: `SELECT * FROM items ORDER BY priority DESC, id ASC`,
});

const listPositionalSql = Object.freeze({
  title: Object.freeze({
    asc: listSql.titleAsc,
    desc: listSql.titleDesc,
  }),
  priority: Object.freeze({
    asc: listSql.priorityAsc,
    desc: listSql.priorityDesc,
  }),
});

const openItemsSql = `
SELECT *
FROM items
WHERE status = 'open'
ORDER BY id
`;

const ownedItemsSql = `
SELECT *
FROM items
WHERE owner = cast(:owner AS text)
ORDER BY id
`;

const ownedItemsPositionalSql = `
SELECT *
FROM items
WHERE owner = cast($1 AS text)
ORDER BY id
`;

const bindingEdgeCasesSql = `
SELECT *
FROM items
WHERE (cast(:note AS text) IS NULL
       OR note::text = cast(:note AS text)
       OR note::text = cast(:note AS text))
  AND (cast(:status AS text) IS NULL
       OR status = cast(:status AS text))
  AND ':not_a_parameter' = ':not_a_parameter'
  -- :not_a_parameter
ORDER BY id
`;

const bindingEdgeCasesPositionalSql = `
SELECT *
FROM items
WHERE (cast($1 AS text) IS NULL
       OR note::text = cast($1 AS text)
       OR note::text = cast($1 AS text))
  AND (cast($2 AS text) IS NULL
       OR status = cast($2 AS text))
  AND ':not_a_parameter' = ':not_a_parameter'
  -- :not_a_parameter
ORDER BY id
`;

export const queries = {
  search: {
    sql: searchSql,
    params: ['status', 'owner', 'needle'],
    async execute(client, input) {
      const values = [input?.status ?? null, input?.owner ?? null, input?.needle ?? null];
      return (await client.query(searchPositionalSql, values)).rows;
    },
  },

  list: {
    sql: listSql,
    params: [],
    async execute(client, input) {
      const sort = input?.sort;
      const direction = input?.direction;
      const statement = listPositionalSql[sort]?.[direction];
      if (!statement) {
        throw new TypeError('sort and direction must be a reviewed list option');
      }
      return (await client.query(statement, [])).rows;
    },
  },

  openItems: {
    sql: openItemsSql,
    params: [],
    async execute(client) {
      return (await client.query(openItemsSql, [])).rows;
    },
  },

  ownedItems: {
    sql: ownedItemsSql,
    params: ['owner'],
    async execute(client, input) {
      return (await client.query(ownedItemsPositionalSql, [input?.owner ?? null])).rows;
    },
  },

  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    params: ['note', 'status'],
    async execute(client, input) {
      const values = [input?.note ?? null, input?.status ?? null];
      return (await client.query(bindingEdgeCasesPositionalSql, values)).rows;
    },
  },
};
