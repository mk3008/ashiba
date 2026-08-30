# Safety controls and authority split

| Control | Authority | Result |
| --- | --- | --- |
| Missing named value | `bindNamedParameters` before DB | PASS in candidate tests and runner oracle |
| Unused named value | `bindNamedParameters` before DB | PASS in candidate tests and runner oracle |
| Hostile SQL-looking value | Parameter binding plus live query | PASS; returned no unintended rows |
| Arbitrary sort string | Application finite mapping before DB | PASS; rejected before execution |
| Optional filters / pagination / stable sort | PostgreSQL runner oracle | PASS in both arms |
| Assignment + audit commit | Native pg transaction / PostgreSQL oracle | PASS in both arms |
| Injected audit failure rollback | Native pg transaction / PostgreSQL oracle | PASS in both arms |

The oracle deliberately treats nullable PostgreSQL typing and behavioral semantics as database/application concerns. The binder proves named-value contract facts; it does not replace PostgreSQL or application/live tests.
