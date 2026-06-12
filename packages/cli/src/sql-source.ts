export function normalizeSqlSource(sql: string): string {
  return sql.replace(/\r\n?/g, '\n');
}
