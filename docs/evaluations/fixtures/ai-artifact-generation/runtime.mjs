/** Evaluation-only mechanical materializer; it does not parse canonical SQL. */
export function prepare(entry, params, sort = []) {
  const branches = [...(entry.optional ?? [])].sort((a, b) => a.compiledRemovalRange.start - b.compiledRemovalRange.start);
  let sql = '';
  let cursor = 0;
  const originalSortIndex = entry.sort?.insertion.index;
  let sortIndex = originalSortIndex;
  for (const branch of branches) {
    const range = branch.compiledRemovalRange;
    if (range.start < cursor) throw new Error('overlapping optional ranges');
    sql += entry.sql.slice(cursor, range.start);
    const supplied = params[`${branch.control}_supplied`] === true;
    const replacement = !supplied
      ? ''
      : params[`${branch.control}_is_null`] === true
        ? branch.presentReplacement.nullSql
        : branch.presentReplacement.valueSql;
    sql += replacement;
    if (sortIndex !== undefined && range.end <= originalSortIndex) sortIndex += replacement.length - (range.end - range.start);
    cursor = range.end;
  }
  sql += entry.sql.slice(cursor);

  if (entry.sort && sort.length > 0) {
    if (sortIndex === undefined) throw new Error('sort insertion is required');
    const fragments = sort.map(({ key, direction }) => {
      const expression = entry.sort.keys[key];
      if (!expression || !/^(asc|desc)$/i.test(direction)) throw new Error('unsafe sort request');
      return `${expression} ${direction.toLowerCase()}`;
    });
    sql = `${sql.slice(0, sortIndex)}${fragments.join(', ')}, ${sql.slice(sortIndex)}`;
  }

  sql = sql.replace(/\$(\d+)/g, (_, raw) => {
    const name = entry.orderedNames[Number(raw) - 1];
    if (!name) throw new Error(`unknown original placeholder $${raw}`);
    return `{{param:${name}}}`;
  });

  const names = [];
  const values = [];
  sql = sql.replace(/\{\{param:([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (_, name) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) throw new Error(`missing parameter ${name}`);
    names.push(name);
    values.push(params[name]);
    return `$${names.length}`;
  });
  return { sql, orderedNames: names, values };
}
