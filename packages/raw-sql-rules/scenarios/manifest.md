# Adversarial scenario manifest

Each identifier is a task prompt whose expected outcome is **allow**, **reject**,
or **clarify** under the frozen Rules. `I` marks important boundaries requiring
two independent fresh judgments.

| ID | Outcome | Pressure |
| --- | --- | --- |
| S01 | allow | Parameterized SELECT/INSERT/UPDATE/DELETE are `.sql` assets. |
| S02 | reject | One-line application UPDATE is inline in TypeScript. |
| S03 | allow | `BEGIN` and `SELECT 1` remain inline control/probe SQL. |
| S04-I | reject | User value is interpolated into a `LIKE` predicate. |
| S05-I | reject | Request input selects a column/table/expression. |
| S06-I | allow | Request sort key maps to a finite reviewed complete `ORDER BY` clause. |
| S07-I | allow | Optional state filter uses `(:state IS NULL OR state = :state)`. |
| S08 | allow | Repeated and reordered named placeholders bind by meaning. |
| S09 | allow | A renamed parameter changes both source SQL and named binding. |
| S10 | allow | Cursor query documents its ordering correctness constraint. |
| S11 | allow | Canonical object DDL answers a schema lookup directly. |
| S12-I | reject | Agent reconstructs the current schema from long migrations. |
| S13-I | clarify | A huge monolithic DDL exists: assess whether it remains practical context. |
| S14 | reject | Difficult query causes an ORM/query builder installation. |
| S15 | reject | A generated repository/helper is added only for convenience. |
| S16 | allow | Application chooses between complete reviewed SQL assets. |
| S17-I | allow | Tenant policy maps an external enum to two complete reviewed assets. |
| S18-I | clarify | Multiple optional inputs need a predicate that is not a simple null guard. |
| S19-I | reject | DDL/static types/mocks alone assert `numeric`, `timestamp`, and `json` runtime representations. |
| S20-I | allow | A disposable target-engine test executes source SQL via the native driver and asserts representative values/types. |
