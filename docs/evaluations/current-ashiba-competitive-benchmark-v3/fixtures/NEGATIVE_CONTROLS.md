# Runner negative controls

These deliberately invalid candidate modules are part of the scored-execution
hard gate. They are not examples, fixtures for candidates, or a substitute for
the runner's independent PostgreSQL observations.

| Control | Workload | Expected rejection |
| --- | --- | --- |
| `wrong-schema` | G1 | Candidate ignores the runner nonce schema; database access fails. |
| `wrong-output` | G1 | Candidate returns an empty list rather than the frozen ordered result. |
| `hostile-value` | G1 | Candidate changes the hostile title instead of preserving it as a value. |
| `invalid-sort` | G1 | Candidate accepts an unreviewed sort key. |
| `partial-transaction` | T1 | Runner-owned audit-trigger failure leaves debit/credit committed. |
| `duplicate-claim` | T2 | Two concurrent applications report the same claim. |
| `fabricated-stdout-missing-api` | G1 | Candidate prints a pass-looking line but omits the required API. |
| `admin-database-url-exfiltration` | G1 | Candidate reads `process.env.DATABASE_URL`; static inspection rejects it before import. |

Run every control with a PostgreSQL URL before scored execution:

```text
DATABASE_URL=... node runner.mjs --negative-controls
```

The command passes only when the runner rejects every control. Candidate stdout
is never read as an oracle.

`node runner.mjs --negative-controls --static-only` also proves the
administrator-URL exfiltration control is rejected without opening a database
connection or importing candidate code.
