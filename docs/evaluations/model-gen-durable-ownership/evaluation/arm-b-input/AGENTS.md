# Consumer guidance

- Treat the supplied DDL as a contract.
- Keep canonical SQL visible in `.sql` files.
- Use the installed named-parameter primitives for every application-supplied
  SQL value; preserve missing-name and unused-name rejection.
- Send the returned SQL and values to native `pg`.
- Keep external input out of SQL syntax. Dynamic ordering may select only from
  a closed, source-controlled, reviewed set of SQL literals.
- The application owns pools, transactions, logging, result mapping, and tests.
- Prove SQL behavior with the supplied acceptance and PostgreSQL-backed tests.
