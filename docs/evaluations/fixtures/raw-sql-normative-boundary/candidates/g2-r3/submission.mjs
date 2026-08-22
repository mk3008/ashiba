const searchSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE (cast(:status AS text) IS NULL OR status = :status)
    AND (cast(:owner AS text) IS NULL OR owner = :owner)
    AND (
      cast(:needle AS text) IS NULL
      OR title ILIKE '%' || :needle || '%'
      OR note ILIKE '%' || :needle || '%'
    )
  ORDER BY id
`;

const searchPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE ($1::text IS NULL OR status = $1)
    AND ($2::text IS NULL OR owner = $2)
    AND (
      $3::text IS NULL
      OR title ILIKE '%' || $3 || '%'
      OR note ILIKE '%' || $3 || '%'
    )
  ORDER BY id
`;

const listSqlAssets = Object.freeze({
  titleAsc: `
    SELECT id, title, status, priority, owner, note
    FROM items
    ORDER BY title ASC, id ASC
  `,
  titleDesc: `
    SELECT id, title, status, priority, owner, note
    FROM items
    ORDER BY title DESC, id ASC
  `,
  priorityAsc: `
    SELECT id, title, status, priority, owner, note
    FROM items
    ORDER BY priority ASC, id ASC
  `,
  priorityDesc: `
    SELECT id, title, status, priority, owner, note
    FROM items
    ORDER BY priority DESC, id ASC
  `,
});

const openItemsSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE status = 'open'
  ORDER BY id
`;

const openItemsPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE status = 'open'
  ORDER BY id
`;

const ownedItemsSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE owner = :owner
  ORDER BY id
`;

const ownedItemsPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE owner = $1
  ORDER BY id
`;

const bindingEdgeCasesSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE note = :note
    AND status = :status
    AND :status::text = :status::text
    AND :note::text = :note::text
    AND 'literal :not_a_parameter' = 'literal :not_a_parameter'
    -- comment :not_a_parameter
  ORDER BY id
`;

const bindingEdgeCasesPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE note = $1
    AND status = $2
    AND $2::text = $2::text
    AND $1::text = $1::text
    AND 'literal :not_a_parameter' = 'literal :not_a_parameter'
    -- comment :not_a_parameter
  ORDER BY id
`;

export const queries = {
  search: {
    sql: searchSql,
    async execute(client, input = {}) {
      const { status = null, owner = null, needle = null } = input;
      return (await client.query(searchPositionalSql, [status, owner, needle])).rows;
    },
  },

  list: {
    sql: listSqlAssets,
    async execute(client, input = {}) {
      const { sort, direction } = input;
      if ((sort !== 'title' && sort !== 'priority') || (direction !== 'asc' && direction !== 'desc')) {
        throw new TypeError('sort and direction must be reviewed finite values');
      }
      const asset = sort === 'title'
        ? (direction === 'asc' ? listSqlAssets.titleAsc : listSqlAssets.titleDesc)
        : (direction === 'asc' ? listSqlAssets.priorityAsc : listSqlAssets.priorityDesc);
      return (await client.query(asset, [])).rows;
    },
  },

  openItems: {
    sql: openItemsSql,
    async execute(client) {
      return (await client.query(openItemsPositionalSql, [])).rows;
    },
  },

  ownedItems: {
    sql: ownedItemsSql,
    async execute(client, input = {}) {
      return (await client.query(ownedItemsPositionalSql, [input.owner ?? null])).rows;
    },
  },

  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    async execute(client, input = {}) {
      return (await client.query(bindingEdgeCasesPositionalSql, [input.note ?? null, input.status ?? null])).rows;
    },
  },
};
