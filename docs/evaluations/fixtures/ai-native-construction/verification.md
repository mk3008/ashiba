# Fixture verification guidance

These checks are deliberately implementation-independent. A reviewer may use
the application's own test command, `psql`, a driver-level probe, and static
inspection. Do not accept a mock-only result as PostgreSQL integration
evidence.

## Static review gates

For both workloads, mark each item `pass`, `fail`, or `not observed`:

| Gate | Evidence required |
|---|---|
| Canonical SQL | One stable SQL source is identified; its text can be copied and run independently with documented parameters. |
| Parameter binding | Search/status/page values are supplied through driver parameters or an equivalent safe binder. No request value is concatenated into SQL syntax. |
| Finite sorting | Sort keys and directions are a reviewed finite mapping; unknown values do not reach SQL syntax. A stable unique tie-breaker exists. |
| Subtractive optionality | Omitting search/status does not add an unreviewed clause or change the base query's meaning. |
| Transaction boundary | Assignment's update and event insert share an explicit transaction/connection, with rollback evidence. |
| PostgreSQL behavior | JSONB aggregation/order, `ILIKE`, and `TIMESTAMPTZ` ordering are performed by PostgreSQL, not silently reimplemented after an unconstrained fetch. |
| Driver boundary | Raw row types and application types are distinct; `BIGINT`, `JSONB`, and `TIMESTAMPTZ` conversion/validation is visible and tested. |
| Architecture fit | Greenfield choices are documented; Brownfield changes preserve the supplied layered conventions and existing behavior. |
| Human review surface | A reviewer can find SQL, parameter mapping, transaction boundary, and mapper without tracing generated artifacts or a large framework. |

## Deterministic live checks

The runner resets to the fixture seed before each case and records the query
text/parameters where the driver exposes them. IDs below refer to the seeded
rows by their recorded fixture values; if a runner uses different IDs, it
records the equivalent rows and expected ordering in the run manifest.

1. **Base list:** no search/status, sort by `created_at desc`, page size 2,
   offset 0. The first two rows equal the seed's two newest orders, and a
   unique ID tie-breaker makes repeated runs identical.
2. **Optional search:** search for a customer name and then an order-number
   fragment. Only matching orders are returned; omitting the search restores
   the base set.
3. **Finite sort/pagination:** sort by `priority asc` and `priority desc` with
   two pages. The concatenated pages equal the full sorted result without
   duplicates or gaps.
4. **Injection probes:** use a search value containing a quote and `OR 1=1`
   and a sort value such as `created_at; DROP TABLE orders`. The first is a
   literal search value, and the second is rejected/normalized; no extra rows,
   schema change, or second statement is observed.
5. **PostgreSQL semantics:** the order with multiple events returns events in
   newest-first order inside JSONB; an order with no events returns the
   documented empty representation. `ILIKE` behavior and timestamp ordering
   are observed from PostgreSQL results.
6. **Successful transaction:** assignment changes the order and adds exactly
   one event with the requested agent/metadata.
7. **Rollback:** force the event `metadata` check failure after the order
   update. The operation fails, and both the order and event count are exactly
   the pre-call values.
8. **Driver boundary:** inspect a raw row and the returned application object.
   `BIGINT` is represented according to the driver (commonly a string),
   `JSONB` is parsed/validated, and `TIMESTAMPTZ` retains its documented
   timezone/instant semantics without an unchecked `any` cast.
9. **Brownfield regression:** rerun every starter test and exercise the three
   pre-existing customer/detail/note operations. No unrelated behavior or
   transaction helper changes are accepted.

## Outcome labels

`done` requires all applicable static gates and live checks to pass. `partial`
means the feature behavior works but a safety, contract, transaction, or
review gate is missing or ambiguous. `not done` means the required feature or
database evidence is absent. Record false repairs (for example a passing test
that changes an existing public type) separately from ordinary retries.
