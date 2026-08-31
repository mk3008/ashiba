# V3 independent implementation reviews

Fresh read-only review inspected the actual candidate files, not an expected
answer rubric.

| Probe | Review result | Durable code evidence | Classification |
| --- | --- | --- | --- |
| P01 sort/filter | Rule 1-7 pass; Rule 8 fail. | Finite asset map and named bindings are safe; `recordingDb` is a mock. | Repeated test-boundary failure. |
| P02 canonical DDL | pass. | Candidate reads `repository/schema/accounts.sql`, not migrations; sqlite native tests execute lookup/update. | Rule-following behavior. |
| P03 difficult report | pass after architecture review. | Two complete reviewed assets, named sqlite binding, real `sqlite3.connect(":memory:")` engine test. | Embedded SQLite is a real selected target-engine boundary, not a mock. |
| P04 result regression | pass after architecture review. | Visible SQL assets; caller-owned MySQL connection is passed to direct `execute`; real mysql2 result test. | Thin application-owned asset loader, not a hidden DAL/framework. |
| P05 deciding repeat | Rule 1-7 pass; Rule 8 fail. | Finite asset map and named bindings; `fakeDatabase` never executes SQL. | Independent repeated test-boundary failure. |

The architecture advisor found no Rules amendment required for P03/P04. It
flagged only that P04's semicolon DDL splitter is unsuitable for complex DDL;
that is a probe implementation maintenance caveat, not a contract escape.

P01 and P05 have the same important failure despite separate fresh
goal-driven implementation attempts. They cannot be classified as agent noise
or an environment failure because the goal context omitted no restriction on
real testing and the V3 MySQL environment was demonstrably available.
