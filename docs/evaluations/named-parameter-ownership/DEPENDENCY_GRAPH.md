# Dependency Graph

```text
canonical .sql (:name / @name)
        |
        +--> compileNamedParameters
        |       |--> PostgreSQL $n binding
        |       |--> mysql2 ? occurrence binding
        |       `--> mssql @name binding
        |
        +--> model-gen
        |       |--> bindingMetadata + sourceHash + --check freshness
        |       |--> result-column contracts
        |       `--> safe-sort / optional-condition PostgreSQL coordinates
        |
        +--> bindNamedParameters
        |       |--> missing / unused rejection
        |       `--> selected native driver values/input
        |
        +--> standalone PostgreSQL contract (indexed rendering)
        `--> project/query/sql-resource deterministic inspection

native pg / mysql2 / mssql --> application and live semantic tests
```

Source evidence: `packages/named-parameters/src/{compiler,index}.ts`; `packages/cli/src/commands/{model-gen,project,query,sql-resource,standalone-postgres-contract}.ts`; `packages/driver-adapter-{pg,mysql2,mssql}/src/index.ts`.

`safe-sort` and optional-condition helpers use compiler-based prefix rendering to translate canonical offsets into PostgreSQL-lowered offsets. They are not merely aliases for the generated binding array. PostgreSQL contract and result-column analysis also use `model-gen` functions beyond binding emission. Therefore deleting named lowering does not prove that `model-gen`, source hashing, or contract checking disappears.
