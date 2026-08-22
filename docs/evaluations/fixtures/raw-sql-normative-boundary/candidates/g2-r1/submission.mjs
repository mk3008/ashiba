/*
 * The SQL strings below are the canonical, named-parameter sources.  The
 * small binder is the execution-boundary adapter: it only changes named
 * parameter tokens into PostgreSQL positional placeholders and never accepts
 * SQL fragments from input.
 */

const parameterName = /[A-Za-z_][A-Za-z0-9_]*/;

function bindNamed(sql, params) {
  let positionalSql = '';
  const values = [];
  const parameterIndexes = new Map();
  let index = 0;

  while (index < sql.length) {
    const character = sql[index];

    if (character === "'") {
      const start = index++;
      while (index < sql.length) {
        if (sql[index] !== "'") {
          index += 1;
        } else if (sql[index + 1] === "'") {
          index += 2;
        } else {
          index += 1;
          break;
        }
      }
      positionalSql += sql.slice(start, index);
      continue;
    }

    if (character === '"') {
      const start = index++;
      while (index < sql.length) {
        if (sql[index] !== '"') {
          index += 1;
        } else if (sql[index + 1] === '"') {
          index += 2;
        } else {
          index += 1;
          break;
        }
      }
      positionalSql += sql.slice(start, index);
      continue;
    }

    if (character === '-' && sql[index + 1] === '-') {
      const start = index;
      index += 2;
      while (index < sql.length && sql[index] !== '\n') index += 1;
      positionalSql += sql.slice(start, index);
      continue;
    }

    if (character === '/' && sql[index + 1] === '*') {
      const start = index;
      index += 2;
      while (index < sql.length && !(sql[index] === '*' && sql[index + 1] === '/')) index += 1;
      index = Math.min(index + 2, sql.length);
      positionalSql += sql.slice(start, index);
      continue;
    }

    if (character === ':' && sql[index + 1] === ':') {
      positionalSql += '::';
      index += 2;
      continue;
    }

    if (character === ':' && sql[index + 1] !== '=') {
      const match = sql.slice(index + 1).match(parameterName);
      if (match) {
        const name = match[0];
        let parameterIndex = parameterIndexes.get(name);
        if (parameterIndex === undefined) {
          parameterIndex = values.length + 1;
          parameterIndexes.set(name, parameterIndex);
          values.push(params[name]);
        }
        positionalSql += `$${parameterIndex}`;
        index += name.length + 1;
        continue;
      }
    }

    positionalSql += character;
    index += 1;
  }

  return { sql: positionalSql, values };
}

async function executeNamed(client, sql, params = {}) {
  const bound = bindNamed(sql, params);
  return (await client.query(bound.sql, bound.values)).rows;
}

const searchSql = `
select id, title, status, priority, owner, note
from items
where (cast(:status as text) is null or status = cast(:status as text))
  and (cast(:owner as text) is null or owner = cast(:owner as text))
  and (cast(:needle as text) is null or title ilike '%' || cast(:needle as text) || '%')
order by id
`;

const listSqlAssets = Object.freeze({
  title: Object.freeze({
    asc: `
select id, title, status, priority, owner, note
from items
order by title asc
`,
    desc: `
select id, title, status, priority, owner, note
from items
order by title desc
`,
  }),
  priority: Object.freeze({
    asc: `
select id, title, status, priority, owner, note
from items
order by priority asc
`,
    desc: `
select id, title, status, priority, owner, note
from items
order by priority desc
`,
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
where owner = cast(:owner as text)
order by id
`;

const bindingEdgeCasesSql = `
select id, title, status, priority, owner, note
from items
where status = :status::text
  and (note = :note::text or note = :note::text)
  and :status::text = :status::text
  and 'literal :not_a_parameter' = 'literal :not_a_parameter'
  -- comment :not_a_parameter
order by id
`;

export const queries = {
  search: {
    sql: searchSql,
    async execute(client, input) {
      return executeNamed(client, searchSql, input);
    },
  },

  list: {
    // A manifest of complete, source-visible SQL assets is the finite safe-sort surface.
    sql: listSqlAssets,
    async execute(client, input) {
      const { sort, direction } = input ?? {};
      const sortAssets = Object.hasOwn(listSqlAssets, sort) ? listSqlAssets[sort] : undefined;
      const selectedSql = sortAssets && Object.hasOwn(sortAssets, direction)
        ? sortAssets[direction]
        : undefined;
      if (!selectedSql) {
        throw new RangeError('Unsupported sort or direction');
      }
      return executeNamed(client, selectedSql);
    },
  },

  openItems: {
    sql: openItemsSql,
    async execute(client) {
      return executeNamed(client, openItemsSql);
    },
  },

  ownedItems: {
    sql: ownedItemsSql,
    async execute(client, input) {
      return executeNamed(client, ownedItemsSql, input);
    },
  },

  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    async execute(client, input) {
      return executeNamed(client, bindingEdgeCasesSql, input);
    },
  },
};
