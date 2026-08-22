const searchSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE (cast(:status as text) IS NULL OR status = cast(:status as text))
    AND (cast(:owner as text) IS NULL OR owner = cast(:owner as text))
    AND (
      cast(:needle as text) IS NULL
      OR title ILIKE ('%' || cast(:needle as text) || '%')
    )
  ORDER BY id
`;

const searchPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE ($1::text IS NULL OR status = $1::text)
    AND ($2::text IS NULL OR owner = $2::text)
    AND ($3::text IS NULL OR title ILIKE ('%' || $3::text || '%'))
  ORDER BY id
`;

const listSql = Object.freeze({
  title: Object.freeze({
    asc: `
      SELECT id, title, status, priority, owner, note
      FROM items
      ORDER BY title ASC, id ASC
    `,
    desc: `
      SELECT id, title, status, priority, owner, note
      FROM items
      ORDER BY title DESC, id ASC
    `,
  }),
  priority: Object.freeze({
    asc: `
      SELECT id, title, status, priority, owner, note
      FROM items
      ORDER BY priority ASC, id ASC
    `,
    desc: `
      SELECT id, title, status, priority, owner, note
      FROM items
      ORDER BY priority DESC, id ASC
    `,
  }),
});

const openItemsSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE status = 'open'
  ORDER BY id
`;

const ownedItemsSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE owner = cast(:owner as text)
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
  WHERE status = :status::text
    AND note = :note::text
    AND status = :status::text
    AND note = :note::text
    AND 'literal :not_a_parameter' IS NOT NULL
    -- comment :not_a_parameter
  ORDER BY id
`;

const bindingEdgeCasesPositionalSql = `
  SELECT id, title, status, priority, owner, note
  FROM items
  WHERE status = $1::text
    AND note = $2::text
    AND status = $1::text
    AND note = $2::text
    AND 'literal :not_a_parameter' IS NOT NULL
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
    sql: listSql,
    async execute(client, input = {}) {
      const { sort, direction } = input;
      const statement = listSql[sort]?.[direction];
      if (statement === undefined) {
        throw new RangeError('Unsupported sort or direction');
      }
      return (await client.query(statement, [])).rows;
    },
  },

  openItems: {
    sql: openItemsSql,
    async execute(client) {
      return (await client.query(openItemsSql, [])).rows;
    },
  },

  ownedItems: {
    sql: ownedItemsSql,
    async execute(client, input = {}) {
      return (await client.query(ownedItemsPositionalSql, [input.owner])).rows;
    },
  },

  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    async execute(client, input = {}) {
      return (await client.query(bindingEdgeCasesPositionalSql, [input.status, input.note])).rows;
    },
  },
};
