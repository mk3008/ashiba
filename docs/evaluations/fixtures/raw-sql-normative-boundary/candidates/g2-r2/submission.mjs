const SEARCH_SQL = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE (cast(:status AS text) IS NULL OR status = :status)
    AND (cast(:owner AS text) IS NULL OR owner = :owner)
    AND (
      cast(:needle AS text) IS NULL
      OR title ILIKE '%' || :needle || '%'
    )
  ORDER BY id
`;

const LIST_SQL = Object.freeze({
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
  WHERE status = :status::text
    AND status = :status
    AND note = :note
    AND note = :note
    AND 'literal :not_a_parameter' IS NOT NULL /* comment :not_a_parameter */
  ORDER BY id
`;

const valueOrNull = (value) => value ?? null;

export const queries = {
  search: {
    sql: SEARCH_SQL,
    async execute(client, input = {}) {
      const status = valueOrNull(input.status);
      const owner = valueOrNull(input.owner);
      const needle = valueOrNull(input.needle);
      const result = await client.query(
        `
          SELECT id, title, status, priority, owner, note
          FROM items
          WHERE (cast($1 AS text) IS NULL OR status = $1)
            AND (cast($2 AS text) IS NULL OR owner = $2)
            AND (
              cast($3 AS text) IS NULL
              OR title ILIKE '%' || $3 || '%'
            )
          ORDER BY id
        `,
        [status, owner, needle],
      );
      return result.rows;
    },
  },

  list: {
    sql: LIST_SQL,
    async execute(client, input = {}) {
      const sort = input.sort;
      const direction = input.direction;
      let sql;
      if (sort === 'title' && direction === 'asc') {
        sql = LIST_SQL.titleAsc;
      } else if (sort === 'title' && direction === 'desc') {
        sql = LIST_SQL.titleDesc;
      } else if (sort === 'priority' && direction === 'asc') {
        sql = LIST_SQL.priorityAsc;
      } else if (sort === 'priority' && direction === 'desc') {
        sql = LIST_SQL.priorityDesc;
      } else {
        throw new TypeError('Unsupported sort or direction');
      }
      const result = await client.query(sql, []);
      return result.rows;
    },
  },

  openItems: {
    sql: OPEN_ITEMS_SQL,
    async execute(client) {
      const result = await client.query(
        `
          SELECT id, title, status, priority, owner, note
          FROM items
          WHERE status = 'open'
          ORDER BY id
        `,
        [],
      );
      return result.rows;
    },
  },

  ownedItems: {
    sql: OWNED_ITEMS_SQL,
    async execute(client, input = {}) {
      const result = await client.query(
        `
          SELECT id, title, status, priority, owner, note
          FROM items
          WHERE owner = $1
          ORDER BY id
        `,
        [valueOrNull(input.owner)],
      );
      return result.rows;
    },
  },

  bindingEdgeCases: {
    sql: BINDING_EDGE_CASES_SQL,
    async execute(client, input = {}) {
      const result = await client.query(
        `
          SELECT id, title, status, priority, owner, note
          FROM items
          WHERE status = $2::text
            AND status = $2
            AND note = $1
            AND note = $1
            AND 'literal :not_a_parameter' IS NOT NULL /* comment :not_a_parameter */
          ORDER BY id
        `,
        [valueOrNull(input.note), valueOrNull(input.status)],
      );
      return result.rows;
    },
  },
};
