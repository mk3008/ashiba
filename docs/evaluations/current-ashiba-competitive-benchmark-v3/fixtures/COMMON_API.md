# Frozen workload API and behaviour

The evaluator imports `createApplication(runtime)` from the candidate's built
ESM entrypoint (normally the build output for `src/application.ts`). The
runner separately and recursively scans the supplied candidate source root; it
does not infer source ownership from the entrypoint's directory. A cell needs
only the operations for its workload plus `close()`:

| Workload | Required operations |
| --- | --- |
| G1 | `list`, `get`, `create`, `assign`, `close` |
| T1 | `transfer`, `close` |
| T2 | `claim`, `close` |
| Q1 | `investigate`, `explain`, `close` |

The operation signatures are the following TypeScript contract. Candidates do
not need to expose unrelated workload methods.

For a live cell, `runtime.connectionString` is a unique, short-lived,
non-superuser candidate role. The runner keeps the administrative connection
string for schema creation, oracle reads, trigger injection, and cleanup. The
candidate role receives only the nonce-schema privileges needed by its
workload, has a ten-second statement timeout and nonce-schema search path, and
does not receive access to the runner's `failure_injection` table.

```ts
export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  list?(input?: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number }): Promise<Ticket[]>;
  get?(input: { id: string }): Promise<Ticket | null>;
  create?(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket>;
  assign?(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  transfer?(input: { fromAccountId: string; toAccountId: string; amountCents: string; note: string }): Promise<{ status: 'ok'; applied: true }>;
  claim?(input: { workerId: string }): Promise<{ claimedWorkId: string | null }>;
  investigate?(input: { requestedTag: string; tier: string }): Promise<{ rows: unknown[]; sourceSql: string; executedSql: string; params: readonly string[] }>;
  explain?(input: { requestedTag: string; tier: string }): Promise<{ sourceSql: string; executedSql: string; params: readonly string[]; plan: unknown }>;
  close(): Promise<void>;
}

export function createApplication(runtime: Runtime): Application | Promise<Application>;
```

## Input, output, and error semantics

All identifiers and money amounts are base-10 integer strings. `id`, account
IDs, and `amountCents` must be positive; `amountCents` must be greater than
zero. `priority` is an integer from 1 through 5. `offset` is an integer from 0
through 10,000, and `limit` is an integer from 1 through 100. Unsupported sort
values, malformed inputs, and out-of-range pagination reject with
`code: 'VALIDATION'`. `get` returns `null` for an absent ticket; `assign` on an
absent ticket rejects with `code: 'NOT_FOUND'`; an unaffordable transfer rejects
with `code: 'INSUFFICIENT_FUNDS'`.

`list` applies supplied status and assignee filters. An `assignee: null` filter
matches only unassigned rows. It sorts by the selected finite source-controlled
field and direction, then `id ASC` as the stable tie-breaker, before offset and
limit. Returned ticket timestamps are ISO-8601 strings, IDs are strings, and
metadata is JSON-safe data. Returned values must not expose a database client
or driver object.

`create` returns the persisted ticket. `assign` writes its audit row in the
same transaction as the ticket update. `transfer` debits, credits, and audits
in a single transaction. `claim` uses a concurrency-safe claim: concurrent
workers may not receive the same work ID. The evaluator enables a private
database trigger after the relevant mutation point for rollback checks. No
runtime property, public input field, environment variable, or candidate test
may enable or predict that injection.

For Q1, candidates own execution of the supplied PostgreSQL task query and
their own `EXPLAIN (FORMAT JSON)` call. `investigate` and `explain` receive the
same data parameters (`requestedTag`, `tier`), not evaluator SQL. Each result
must identify the candidate-owned source SQL, executed SQL, and bound parameter
values. The runner requires the normalized source and executed SQL to match
between `investigate` and `explain`, then requires `explain.plan` to have the
top-level PostgreSQL `FORMAT JSON` shape (`[{ Plan: { "Node Type", "Plan Rows",
... } }]`). The runner independently computes the expected rows from its
frozen oracle; it does not execute candidate SQL as the plan oracle.

`close()` is required, resolves with no value, and is idempotent. The
workload-relevant non-close operation after a successful close rejects with
`code: 'APPLICATION_CLOSED'`. The runner calls it on every application
instance, including control failures. For T2, the runner holds both workers at
a runner-owned start barrier before dispatching `claim`; raw `Promise.all`
without that barrier is not the concurrency control.

The runner owns DDL, seed data, nonce schema lifecycle, behavioural assertions,
failure injection, independent database observations, and cleanup. It never
imports candidate SQL, generated types, tests, or stdout as an oracle.
