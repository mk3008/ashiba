# V6 confirmation

Rules v6 SHA-256 is recorded in `rules-v6.sha256`. One fresh bootstrap task and
one fresh steady-state task received the final normative wording.

| Task | Result |
| --- | --- |
| Bootstrap | PASS. It used canonical DDL, a visible SQL asset, MySQL 8.4/native mysql2 named binding, representative data, behavior assertions, DECIMAL/DATETIME/ID runtime assertions, rollback, and one command. |
| Steady state | PASS. With the existing example visible, it extended a fixed named-parameter asset for optional minimum priority and asserted owner boundaries, sorting, behavior, and runtime representations through MySQL. |

Independent read-only review passed both candidates and found no test framework,
helper, ORM, generated abstraction, or broad infrastructure. Evaluator reruns:

```text
node evaluation/v6/bootstrap/candidate/regression.mjs       PASS
node evaluation/v6/steady-state/candidate/regression.mjs    PASS
```
