# X1 runner API

```ts
export type Dimension = 'status' | 'assignee' | 'tag';
export type Metric = 'count' | 'priorityTotal';
export interface ReportRequest {
  dimensions: readonly Dimension[];
  metric: Metric;
  includeTagJoin: boolean;
  statuses?: readonly ('open' | 'pending' | 'closed')[];
  requestedTag?: string;
}
export interface ReportResult {
  rows: readonly Record<string, string | number | null>[];
  sourceSql: string;
  executedSql: string;
  params: readonly unknown[];
}
export interface ReportApplication {
  runReport(input: ReportRequest): Promise<ReportResult>;
  close(): Promise<void>;
}
export function createReportApplication(runtime: {
  connectionString: string;
  schema: string;
}): ReportApplication | Promise<ReportApplication>;
```

The report groups tickets by the requested ordered dimensions. `tag` means a
join to the runner-owned `ticket_tags(ticket_id, tag)` relation and is legal
only when `includeTagJoin` is true. `count` is the grouped ticket count and
`priorityTotal` is the grouped `SUM(tickets.priority)` as a number. Status and
tag filters are optional and combine with `AND`. Rows are ascending by each
requested dimension (with nulls last) and contain each requested dimension
plus `metric`. The runner supplies three valid requests and a hostile tag
value; it independently computes each expected row set. Duplicated dimensions,
an empty dimensions list, an invalid status, unknown metric, unknown dimension,
or `tag` without its join must reject with `code: 'VALIDATION'`.
