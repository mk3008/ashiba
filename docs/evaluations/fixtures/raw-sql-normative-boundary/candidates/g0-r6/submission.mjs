const searchSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE (CAST(:status AS text) IS NULL OR status = CAST(:status AS text))
    AND (CAST(:owner AS text) IS NULL OR owner = CAST(:owner AS text))
    AND (CAST(:needle AS text) IS NULL
      OR title ILIKE '%' || CAST(:needle AS text) || '%')
  ORDER BY id
`;

const searchPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE (CAST($1 AS text) IS NULL OR status = CAST($1 AS text))
    AND (CAST($2 AS text) IS NULL OR owner = CAST($2 AS text))
    AND (CAST($3 AS text) IS NULL
      OR title ILIKE '%' || CAST($3 AS text) || '%')
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
  WHERE owner = $1::text
  ORDER BY id
`;

const bindingEdgeCasesSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE note IS NOT DISTINCT FROM :note::text
    AND note IS NOT DISTINCT FROM :note::text
    AND status IS NOT DISTINCT FROM :status::text
    AND status IS NOT DISTINCT FROM :status::text
    AND 'literal :not_a_parameter' IS NOT NULL /* comment :not_a_parameter */
  ORDER BY id
`;

const bindingEdgeCasesPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE note IS NOT DISTINCT FROM $1::text
    AND note IS NOT DISTINCT FROM $1::text
    AND status IS NOT DISTINCT FROM $2::text
    AND status IS NOT DISTINCT FROM $2::text
    AND 'literal :not_a_parameter' IS NOT NULL /* comment :not_a_parameter */
  ORDER BY id
`;

const valueOrNull = (input, key) => input?.[key] ?? null;

export const queries = {
  search: {
    sql: searchSql,
    async execute(client, input) {
      const result = await client.query(searchPositionalSql, [
        valueOrNull(input, 'status'),
        valueOrNull(input, 'owner'),
        valueOrNull(input, 'needle'),
      ]);
      return result.rows;
    },
  },

  list: {
    sql: 'named SQL asset manifest: listSqlAssets.titleAsc, listSqlAssets.titleDesc, listSqlAssets.priorityAsc, listSqlAssets.priorityDesc',
    async execute(client, input) {
      const sort = input?.sort;
      const direction = input?.direction;
      if (sort !== 'title' && sort !== 'priority') {
        throw new TypeError('Unsupported sort');
      }
      if (direction !== 'asc' && direction !== 'desc') {
        throw new TypeError('Unsupported direction');
      }

      const asset = listSqlAssets[`${sort}${direction[0].toUpperCase()}${direction.slice(1)}`];
      const result = await client.query(asset, []);
      return result.rows;
    },
  },

  openItems: {
    sql: openItemsSql,
    async execute(client) {
      const result = await client.query(openItemsPositionalSql, []);
      return result.rows;
    },
  },

  ownedItems: {
    sql: ownedItemsSql,
    async execute(client, input) {
      const result = await client.query(ownedItemsPositionalSql, [valueOrNull(input, 'owner')]);
      return result.rows;
    },
  },

  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    async execute(client, input) {
      const result = await client.query(bindingEdgeCasesPositionalSql, [
        valueOrNull(input, 'note'),
        valueOrNull(input, 'status'),
      ]);
      return result.rows;
    },
  },
};
