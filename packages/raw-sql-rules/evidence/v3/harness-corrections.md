# V3 harness corrections

The first V3 rerun found two harness defects: the structural phrase check still
looked for the removed v2 wording, and the MySQL lane did not drop tables before
re-execution. Both were classified as harness defects, not Rules failures.
`check.mjs` now matches the permanent Rule 5 wording, and the live runner drops
its disposable tables before and after execution. Package check and two
consecutive live runs then passed.
