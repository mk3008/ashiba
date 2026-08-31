# Rule amendments

## A1 — v0 to v1

- **Evidence:** two independent frozen-v0 judgments agreed that dynamically
  appending an optional predicate was rejected, while the safe alternative for
  multi-filter semantics was not explicit. They also identified the lack of a
  mechanical size threshold for monolithic DDL.
- **Change:** Rule 4 now says that optional filters use either one fixed bound
  statement or a selection among complete reviewed assets, never runtime
  fragment assembly. Rule 3 uses practical object discovery, not a size number.
  Rule 5 now distinguishes a native named application API from positional
  lowering.
- **Rationale:** clarify the existing finite reviewed-asset exception rather
  than introducing a fragment builder or framework.
- **Affected regression:** S07, S12, S13, S17, S18.

## A2 — v1 to v2

- **Evidence:** the evaluation method correctly limited static checks, but the
  normative Rules did not make the database/driver runtime authority explicit.
- **Change:** Rule 8 requires representative automated database-backed tests
  through the native driver, rejects type/DDL/mock-only runtime claims, and
  keeps test architecture application-owned.
- **Rationale:** Rules constrain visible freedom; real database regression
  tests establish behavior, constraints, transaction semantics, and runtime
  driver representations without introducing a test framework.
- **Affected regression:** S19 and S20.
