# SD schema-drift control

SD is an observation-only, non-aggregate control. For an already preserved
strict-treatment G1 success, it records the first measured stage at which an
unchanged candidate observes a database-only DDL change. It does not rank
compile-time detection above PostgreSQL execution-time detection and it never
alters a primary result.

`runner.mjs` creates fresh nonce fixtures, verifies a baseline `get` and
`list`, applies exactly one mutation per fixture, and reruns the supplied
candidate commands plus those operations. The runner owns mutations, database
state, and cleanup. Candidate source is hashed before and after every run.
See `REPRODUCE.md` for an explicit materialisation and run command.
