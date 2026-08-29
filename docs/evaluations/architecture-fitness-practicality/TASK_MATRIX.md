# Task Matrix

| Task | Fixture / consumer | Result |
| --- | --- | --- |
| A read | `evaluation/fixtures/read-current.sql` and generated binding | pass: JOIN, four inputs, nullable guards, multiple results, pagination |
| B change | `read-current.sql` -> `read-changed.sql` | pass: added locale and stale artifact check exited 1 |
| C sort | Support Inbox / Ticket Queue | concern: broad CASE ordering versus compact allowlist |
| D write | Ticket Queue live verify | pass: native transaction + rollback |
| E schema | DDL fixture / Support Inbox | mixed: query uses/lint useful, migration output needs review |
| F failure | negative-control script and focused tests | pass: bounded guards fail at their authority |

Run commands are listed in [REPRODUCTION.md](REPRODUCTION.md).
