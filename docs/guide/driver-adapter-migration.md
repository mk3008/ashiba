# Migrating from removed driver adapters

`@ashiba-ts/driver-adapter-core`, `@ashiba-ts/driver-adapter-pg`,
`@ashiba-ts/driver-adapter-mysql2`, and `@ashiba-ts/driver-adapter-mssql`
have been removed. This is an intentional breaking package removal; no
deprecated package, forwarding wrapper, or compatibility alias remains.

PostgreSQL/pg remains PRIMARY. MySQL/mysql2 and SQL Server/mssql remain
SUPPORTED-SECONDARY. Only Ashiba-owned runtime wrappers and query rewriting
were removed. Keep canonical SQL and its generated binding metadata, bind
values separately, and execute through the application-owned native driver:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ selected native driver
→ application/live tests
```

1. Keep the existing canonical `.sql` file and run `ashiba model-gen` whenever
   the SQL changes.
2. Select the matching generated binding metadata.
3. Call `bindNamedParameters` with application-owned values. It continues to
   reject missing and unused names and never interpolates values into SQL.
4. Pass the resulting parameterized SQL and separate values to the selected
   native driver. For pg, pass `sql` and `values` to `pool.query`. For mysql2,
   pass them to `execute`. For mssql, register each
   `bindingMetadata.bindings.mssql.parameterNames[index]` with the matching
   `values[index]` through `request.input(name, value)`, then run
   `request.query(sql)`. The application owns pools, transactions, retries,
   logging, telemetry, masking, and error policy.

## Optional filters and sorting

The removed runtime optional-condition compressor no longer rewrites canonical
SQL. Keep a visible nullable guard when it fits the query, or choose explicit
application-owned SQL variants. Application and live tests are the final
authority for optional-filter behavior.

The removed safe-sort runtime no longer accepts a request-time sort profile.
Map public sort inputs to a finite, reviewed application-owned set of values
that canonical SQL handles explicitly. Never concatenate raw user input into
SQL syntax. Test every public sort choice and retain a deterministic stable
order where the product needs one.

Existing adapter observer, source-hash, retry, and logging configuration is
application integration code. Retain only the behavior your application needs
at its native-driver boundary.

## PostgreSQL contract

`ashiba postgres-contract write` and `ashiba postgres-contract check` remain
optional standalone PostgreSQL proof. They are not a runtime adapter and do
not take ownership of application execution, transactions, or logging.
