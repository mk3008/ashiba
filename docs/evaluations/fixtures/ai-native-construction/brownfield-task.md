# Brownfield task

## Starting application

The fixture runner supplies a working application and its tests before the
agent starts. It is an intentionally ordinary layered application, not a
vertical-slice or Ashiba scaffold. Its existing behavior is:

- a customer detail operation that reads a customer and its order count;
- an order detail operation that reads one order and its latest event;
- a note-writing operation that already uses the application's shared
  transaction helper; and
- repository, service, and transport layers with established naming,
  formatting, error handling, and test conventions.

The exact paths and framework are part of the supplied starter repository.
The agent must inspect and extend those conventions rather than moving the
application to a prescribed architecture. The runner snapshots the starter
commit, schema, seed, and focused test output so a reviewer can distinguish a
feature change from unrelated cleanup.

The starter database uses the same `customers`, `orders`, and `order_events`
contract as the greenfield fixture: `orders` contains `BIGINT id`, customer
reference, `status`, `priority`, `total_cents BIGINT`, nullable `assigned_to`,
and `created_at TIMESTAMPTZ`; `order_events` contains a foreign-keyed order,
`event_type`, `metadata JSONB NOT NULL CHECK (jsonb_typeof(metadata) =
'object')`, and `created_at TIMESTAMPTZ`. The starter seed has at least four
orders, an order with multiple events, and an order with no events. The runner
records the exact seed values so pagination assertions are reproducible.

## Assignment

Add an **agent order queue** feature to the existing application. It must
provide a paged list of orders across customers and an assignment command,
while preserving all existing customer, detail, and note behavior. The
transport and public naming follow the starter application's conventions.

## Required behavior

1. **Canonical SQL.** Add one human-reviewable canonical SQL statement for the
   queue list. It joins customer data, optionally searches customer name or
   order number, returns the ordered JSONB event summary, and applies stable
   sorting plus limit/offset. The SQL must be independently executable with
   documented parameters and must fit the existing repository's SQL ownership
   convention.
2. **Bound dynamic input.** Search text, optional status, sort choice,
   direction, limit, and offset are values at the application boundary. No
   request value may become SQL syntax. Sorting uses a finite reviewed set
   (at minimum `created_at` and `priority`) and a stable tie-breaker; unknown
   choices are rejected or normalized.
3. **Optional search, sorting, pagination.** Omitted filters preserve the
   starter's complete queue semantics. Supplied search and status narrow the
   result. Pagination is validated and bounded, and page boundaries are
   repeatable under the same database snapshot.
4. **Transaction boundary.** Assignment updates the order and appends an
   event through the starter's transaction mechanism, on one connection. A
   database failure after the update (for example invalid JSONB metadata)
   rolls both changes back. Do not replace the shared transaction helper with
   an unscoped second connection.
5. **Non-trivial PostgreSQL behavior.** Retain JSONB aggregation with event
   ordering and empty-event handling, `ILIKE` search, and `TIMESTAMPTZ`
   ordering. Do not replace these with application-side filtering or sorting.
6. **Schema/driver boundary.** Follow the starter's raw-row and domain types,
   and make the PostgreSQL representations of `BIGINT`, `JSONB`, and
   `TIMESTAMPTZ` explicit at the mapper boundary. Preserve existing external
   contracts while handling driver values safely.

## Scope and compatibility

Do not rewrite unrelated layers, introduce a new repository abstraction, or
delete existing tests to make the feature pass. A small migration or index is
allowed when justified by the supplied schema and is recorded separately from
the feature. Existing tests must remain green, and new focused tests must
cover the queue, the assignment rollback, the injection probe, and the raw
type boundary.

The starter repository is the brownfield fixture; this document specifies its
observable contract rather than dictating its file layout. A runner may use a
different conventional layered implementation, but must hold the behavior and
starting-state contract constant across A, B, and C.
