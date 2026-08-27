# SQL Server / mssql

Classification: **fit-with-small-gap**.

Live SQL Server 2022 / `mssql` 11.0.1 execution preserved the driver-native request API. Canonical names compiled to `@customerId` and `@status`; application code created `Request` objects, called `request.input(name, value)` for generated logical parameter names, and then called `request.query(sql)`. It also owned the `Transaction` lifecycle and rollback.

The complete slice passed: join, ordered get/list, repeated parameter, nullable result, insert/update, generated identity output, rollback residue check, missing/unused rejection, stale metadata rejection before native execution, and hostile-value parameterization control. Returned bigint was `string`, decimal `number`, datetime `Date`, bit `boolean`, nullable column `null`; DML exposed `rowsAffected` and generated id was obtained through `OUTPUT INSERTED.id` as a `string`.

Fresh-agent distribution review found an existing optional adapter but no SQL Server starter/reference/testkit; `ashiba init --db sqlserver --driver mssql` intentionally rejects. The native request loop is small and ordinary. It does not justify a new generic execution adapter or runtime SQL parser.
