<div v-pre>
# Type Alias: AshibaPostgresQueryModel

> **AshibaPostgresQueryModel** = `object`

Defined in: [packages/driver-adapter-pg/src/index.ts:42](https://github.com/mk3008/ashiba/blob/5317a339ef21a6059cc9a9048975aa34a6318dd2/packages/driver-adapter-pg/src/index.ts#L42)

CLI-generated query model required by the PostgreSQL adapter.

## Properties

### analysis

> **analysis**: `AshibaQueryModelAnalysis`

Defined in: [packages/driver-adapter-pg/src/index.ts:43](https://github.com/mk3008/ashiba/blob/5317a339ef21a6059cc9a9048975aa34a6318dd2/packages/driver-adapter-pg/src/index.ts#L43)

***

### bindings?

> `optional` **bindings?**: `object`

Defined in: [packages/driver-adapter-pg/src/index.ts:44](https://github.com/mk3008/ashiba/blob/5317a339ef21a6059cc9a9048975aa34a6318dd2/packages/driver-adapter-pg/src/index.ts#L44)

#### postgres?

> `optional` **postgres?**: `object`

##### postgres.sourceHash?

> `optional` **sourceHash?**: `string`

##### postgres.sql

> **sql**: `string`

##### postgres.orderedNames

> **orderedNames**: readonly `string`[]

##### postgres.safeSortInsertion?

> `optional` **safeSortInsertion?**: `object`

##### postgres.safeSortInsertion.index

> **index**: `number`

##### postgres.optionalConditionCompression?

> `optional` **optionalConditionCompression?**: `object`

##### postgres.optionalConditionCompression.branches

> **branches**: readonly `object`[]
</div>
