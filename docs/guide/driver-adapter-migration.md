# Migrating from removed MySQL and SQL Server adapters

`@ashiba-ts/driver-adapter-mysql2` and `@ashiba-ts/driver-adapter-mssql` have
been removed. This is an intentional breaking package removal; no deprecated
package, forwarding wrapper, or compatibility alias remains.

MySQL/mysql2 and SQL Server/mssql remain supported secondary DBMS targets.
Only Ashiba-owned execution wrappers were removed. Keep canonical SQL and its
generated binding metadata, bind values separately, and execute through the
application-owned native driver:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ native mysql2 or mssql
→ application/live tests
```

1. Keep the existing canonical `.sql` file and run `ashiba model-gen` whenever
   the SQL changes.
2. Select the matching generated binding metadata.
3. Call `bindNamedParameters` with application-owned values. It continues to
   reject missing and unused names and never interpolates values into SQL.
4. Pass the resulting parameterized SQL and separate values to the selected
   native driver. For mysql2, pass `sql` and `values` to `execute`. For mssql,
   register each `bindingMetadata.bindings.mssql.parameterNames[index]` with
   the matching `values[index]` through `request.input(name, value)`, then run
   `request.query(sql)`. The application owns pools, transactions, retries,
   logging, telemetry, and error policy.

Existing adapter-specific observer and retry configuration is application
integration code. Retain only the behavior your application needs at its own
native-driver boundary.

This removal does not change PostgreSQL/pg support, the optional standalone
PostgreSQL contract, or the productization-pending optional-condition and
safe-sort capabilities.
