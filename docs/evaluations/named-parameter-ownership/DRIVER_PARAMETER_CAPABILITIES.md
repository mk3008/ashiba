# Selected Driver Parameter Capabilities

Live fixture: common `np_orders` table with distinct same-type text values. Versions and commands are in [experiment design](EXPERIMENT_DESIGN.md).

| Driver | Version | Application-facing supported syntax | Meaningful names retained? | Who lowers? | Missing | Unused | Repeated name | Prepared execution | Live verified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pg | 8.21.0 | `$1`, `$2`, … plus ordered values | No | application supplies indexed values | server rejects count mismatch | server rejects count mismatch | same index reuses value | `client.query` | Yes, PostgreSQL 18 |
| mysql2 | 3.22.3 | `:name` object when `namedPlaceholders: true`; also `?` array | Yes in application SQL/object | mysql2 named-placeholders implementation converts to `?` | rejects undefined/missing at execute | accepts extra object property | repeated `:actor_id` works | `execute` | Yes, MySQL 8.4 |
| mssql | 11.0.1 | `@name` SQL plus `request.input(name, value)` | Yes | request/driver binding | SQL Server rejects unregistered `@name` | accepts extra input | repeated `@actor_id` works | `request.query` | Yes, SQL Server 2022 |

The MySQL finding is driver-facing, not an inference from MySQL protocol. The installed mysql2 source/types expose `namedPlaceholders?: boolean`; the live run used it with `execute`. Its internal conversion is mysql2 responsibility. SQL Server's `@name` SQL and registration are application-facing driver API, even though its wire implementation is not Ashiba's concern.

Neither named driver path rejects surplus application data. That is the material gap against `bindNamedParameters` in the evaluated shape.
