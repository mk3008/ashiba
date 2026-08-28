# Negative Controls

| Failure case | Current Ashiba detects? | Selected driver detects? | Application/live tests can detect? | Unique named value? |
| --- | --- | --- | --- | --- |
| Missing application name | Yes, pre-execution | pg/MySQL/mssql all reject at execution | Usually | Earlier/common error |
| Unused application value | Yes, pre-execution | pg count rejects ordered extra; mysql2/mssql accept named extra | Only if test targets it | Yes for mysql2/mssql and named object paths |
| pg `$n` count mismatch | N/A to direct arm | Yes | N/A | No |
| mysql2 anonymous occurrence omission | Yes on current binding | Yes, execute rejects | N/A | No |
| Repeated anonymous value omitted | current binding supplies occurrences | Yes, execute rejects | N/A | Current avoids occurrence duplication in callsite |
| Same-type swap | No; values can be semantically wrong | No; returned empty result | Yes if behavior tested | No—semantic tests remain required |
| Named semantic cross-wire | No | No | Yes if behavior tested | No—names are not semantic type proof |
| SQL-only insertion | binder rejects missing name | direct path errors at execution; named drivers error if referenced missing | Usually | Earlier/common error |
| Callsite-only insertion | binder rejects unused name | mysql2/mssql accept it | Rarely | Yes |
| Review comment drift | No by design | No | Review only | No; comments are non-normative |

Live result details are in `raw-results.json`. The same-type swap and `shop_id = :status AND status = :shop_id` both returned zero rows with this fixture. A rollback-scoped mutation version would have the same shape risk, so no destructive mutation was needed to establish the severity class: a wrong update target would be more severe than the observed wrong empty result.
