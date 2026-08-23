export type SortKey = 'priority' | 'createdAt' | 'subject';
export type Direction = 'asc' | 'desc';
export type SortInput = { key: SortKey; direction: Direction };

const expressions: Record<SortKey, string> = {
  priority: "case t.priority when 'urgent' then 1 when 'normal' then 2 when 'low' then 3 else 4 end",
  createdAt: 't.created_at',
  subject: 't.subject',
};

export function placeTicketOrdering(sql: string, sort: readonly SortInput[] = []): string {
  if (sort.length > 3) throw new Error('At most three sort keys are allowed.');
  const seen = new Set<string>();
  const terms = sort.map(({ key, direction }) => {
    if (!(key in expressions)) throw new Error(`Invalid sort key: ${key}`);
    if (direction !== 'asc' && direction !== 'desc') throw new Error(`Invalid sort direction: ${direction}`);
    if (seen.has(key)) throw new Error(`Duplicate sort key: ${key}`);
    seen.add(key);
    return `${expressions[key]} ${direction}`;
  });
  const orderBy = [...terms, 't.id asc'].join(', ');
  const stable = 'order by t.id asc';
  if (!sql.includes(stable)) throw new Error('Expected stable ticket ordering is missing.');
  return sql.replace(stable, `order by ${orderBy}`);
}
