# Arm A delta

Use the supplied packed `@ashiba-ts/named-parameters` package and native `pg`.
Keep canonical SQL visible. Compile named SQL and bind values with the Ashiba
compiler/binder before calling `pg`. Do not add an ORM, query builder, CLI,
generated binding artifact, source-hash freshness workflow, or framework.
