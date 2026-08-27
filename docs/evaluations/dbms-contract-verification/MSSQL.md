# SQL Server 2022 / mssql

Classification: **`native-contract-small-gap`**, not an implementation recommendation.

`sp_describe_first_result_set` statically described the joined SELECT without execution: column names, SQL types, and `is_nullable` were returned. The INSERT description left zero rows. This is the correct native result-metadata candidate; `SET FMTONLY` was not used.

`sp_describe_undeclared_parameters` inferred a simple `@customerId bigint` and `@status nvarchar(32)`, but rejected the same repeated `@status` used in the optional filter (error 11508). It cannot be the authoritative automatic parameter contract. A full lane would need explicit parameter declarations and a separate mssql representation mapping, both fail-closed; that is more product policy than this evaluation authorizes.
