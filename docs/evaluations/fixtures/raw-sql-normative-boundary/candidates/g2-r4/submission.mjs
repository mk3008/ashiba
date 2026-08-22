const searchSql = `
select id, title, status, priority, owner, note
from items
where (cast(:status as text) is null or status = :status)
  and (cast(:owner as text) is null or owner = :owner)
  and (
    cast(:needle as text) is null
    or title ilike '%' || :needle || '%'
    or note ilike '%' || :needle || '%'
  )
order by id
`;

const listSqlAssets = Object.freeze({
  title: Object.freeze({
    asc: `select id, title, status, priority, owner, note from items order by title asc`,
    desc: `select id, title, status, priority, owner, note from items order by title desc`,
  }),
  priority: Object.freeze({
    asc: `select id, title, status, priority, owner, note from items order by priority asc`,
    desc: `select id, title, status, priority, owner, note from items order by priority desc`,
  }),
});

const openItemsSql = `
select id, title, status, priority, owner, note
from items
where status = 'open'
order by id
`;

const ownedItemsSql = `
select id, title, status, priority, owner, note
from items
where owner = :owner
order by id
`;

const bindingEdgeCasesSql = `
select id, title, status, priority, owner, note
from items
where note = :note
  and note = :note
  and (:status::text is null or status = :status)
  and 'literal :not_a_parameter' is not null
  -- comment :not_a_parameter
order by id
`;

export const queries = {
  search: {
    sql: searchSql,
    async execute(client, input = {}) {
      const result = await client.query(
        `
select id, title, status, priority, owner, note
from items
where (cast($1 as text) is null or status = $1)
  and (cast($2 as text) is null or owner = $2)
  and (
    cast($3 as text) is null
    or title ilike '%' || $3 || '%'
    or note ilike '%' || $3 || '%'
  )
order by id
`,
        [input.status ?? null, input.owner ?? null, input.needle ?? null],
      );
      return result.rows;
    },
  },

  list: {
  sql: listSqlAssets,
    async execute(client, input = {}) {
      const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
      const sortSql = hasOwn(listSqlAssets, input.sort) ? listSqlAssets[input.sort] : undefined;
      const positionalSql = sortSql && hasOwn(sortSql, input.direction)
        ? sortSql[input.direction]
        : undefined;
      if (positionalSql === undefined) {
        throw new TypeError('Unsupported list sort or direction');
      }
      const result = await client.query(positionalSql, []);
      return result.rows;
    },
  },

  openItems: {
    sql: openItemsSql,
    async execute(client) {
      const result = await client.query(
        `
select id, title, status, priority, owner, note
from items
where status = 'open'
order by id
`,
        [],
      );
      return result.rows;
    },
  },

  ownedItems: {
    sql: ownedItemsSql,
    async execute(client, input = {}) {
      const result = await client.query(
        `
select id, title, status, priority, owner, note
from items
where owner = $1
order by id
`,
        [input.owner ?? null],
      );
      return result.rows;
    },
  },

  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    async execute(client, input = {}) {
      const result = await client.query(
        `
select id, title, status, priority, owner, note
from items
where note = $1
  and note = $1
  and ($2::text is null or status = $2)
  and 'literal :not_a_parameter' is not null
  -- comment :not_a_parameter
order by id
`,
        [input.note ?? null, input.status ?? null],
      );
      return result.rows;
    },
  },
};
