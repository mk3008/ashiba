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

const listSql = `
SELECT id, title, status, priority, owner, note
FROM items
ORDER BY
  CASE WHEN :sort = 'title' AND :direction = 'asc' THEN title END ASC,
  CASE WHEN :sort = 'title' AND :direction = 'desc' THEN title END DESC,
  CASE WHEN :sort = 'priority' AND :direction = 'asc' THEN priority END ASC,
  CASE WHEN :sort = 'priority' AND :direction = 'desc' THEN priority END DESC,
  id ASC
`;

const openItemsSql = `
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

const bindingEdgeCasesSql = `
SELECT id, title, status, priority, owner, note
FROM items
WHERE note = :note::text
  AND status = :status::text
  AND note = :note
  AND status = :status
  AND 'literal :not_a_parameter' IS NOT NULL
-- comment :not_a_parameter
ORDER BY id
`;

function bindNamed(sql, params) {
  let text = '';
  const values = [];
  let state = 'normal';
  let dollarTag = '';

  for (let i = 0; i < sql.length;) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (state === 'line-comment') {
      text += ch;
      i += 1;
      if (ch === '\n') state = 'normal';
      continue;
    }
    if (state === 'block-comment') {
      text += ch;
      i += 1;
      if (ch === '*' && next === '/') {
        text += '/';
        i += 1;
        state = 'normal';
      }
      continue;
    }
    if (state === 'single-quote') {
      text += ch;
      i += 1;
      if (ch === "'" && next === "'") {
        text += "'";
        i += 1;
      } else if (ch === "'") {
        state = 'normal';
      }
      continue;
    }
    if (state === 'double-quote') {
      text += ch;
      i += 1;
      if (ch === '"' && next === '"') {
        text += '"';
        i += 1;
      } else if (ch === '"') {
        state = 'normal';
      }
      continue;
    }
    if (state === 'dollar-quote') {
      if (sql.startsWith(dollarTag, i)) {
        text += dollarTag;
        i += dollarTag.length;
        state = 'normal';
      } else {
        text += ch;
        i += 1;
      }
      continue;
    }

    if (ch === '-' && next === '-') {
      text += '--';
      i += 2;
      state = 'line-comment';
      continue;
    }
    if (ch === '/' && next === '*') {
      text += '/*';
      i += 2;
      state = 'block-comment';
      continue;
    }
    if (ch === "'") {
      text += ch;
      i += 1;
      state = 'single-quote';
      continue;
    }
    if (ch === '"') {
      text += ch;
      i += 1;
      state = 'double-quote';
      continue;
    }
    if (ch === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        text += dollarTag;
        i += dollarTag.length;
        state = 'dollar-quote';
        continue;
      }
    }
    if (
      ch === ':' &&
      sql[i - 1] !== ':' &&
      next !== ':' &&
      /[A-Za-z_]/.test(next ?? '')
    ) {
      let end = i + 2;
      while (end < sql.length && /[A-Za-z0-9_]/.test(sql[end])) end += 1;
      const name = sql.slice(i + 1, end);
      values.push(params[name] ?? null);
      text += `$${values.length}`;
      i = end;
      continue;
    }
    text += ch;
    i += 1;
  }
  return { text, values };
}

export const queries = {
  search: {
    sql: searchSql,
    async execute(client, input = {}) {
      const bound = bindNamed(searchSql, {
        status: input.status,
        owner: input.owner,
        needle: input.needle,
      });
      return (await client.query(bound.text, bound.values)).rows;
    },
  },
  list: {
    sql: listSql,
    async execute(client, input = {}) {
      const { sort, direction } = input;
      if (!['title', 'priority'].includes(sort)) {
        throw new TypeError('sort must be title or priority');
      }
      if (!['asc', 'desc'].includes(direction)) {
        throw new TypeError('direction must be asc or desc');
      }
      const bound = bindNamed(listSql, { sort, direction });
      return (await client.query(bound.text, bound.values)).rows;
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
      const bound = bindNamed(ownedItemsSql, { owner: input.owner });
      return (await client.query(bound.text, bound.values)).rows;
    },
  },
  bindingEdgeCases: {
    sql: bindingEdgeCasesSql,
    async execute(client, input = {}) {
      const bound = bindNamed(bindingEdgeCasesSql, {
        note: input.note,
        status: input.status,
      });
      return (await client.query(bound.text, bound.values)).rows;
    },
  },
};
