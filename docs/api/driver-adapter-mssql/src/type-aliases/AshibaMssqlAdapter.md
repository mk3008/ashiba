<div v-pre>
# Type Alias: AshibaMssqlAdapter

> **AshibaMssqlAdapter** = `object`

Defined in: [packages/driver-adapter-mssql/src/index.ts:70](https://github.com/mk3008/ashiba/blob/887798dd82defe2a1a86ca1387fc0647d15ba5d2/packages/driver-adapter-mssql/src/index.ts#L70)

Thin mssql adapter interface exposed to application code.

## Methods

### execute()

> **execute**&lt;`Row`\&gt;(`query`, `params?`): `Promise`&lt;[`MssqlQueryResult`](MssqlQueryResult.md)\<`Row`\&gt;\>

Defined in: [packages/driver-adapter-mssql/src/index.ts:71](https://github.com/mk3008/ashiba/blob/887798dd82defe2a1a86ca1387fc0647d15ba5d2/packages/driver-adapter-mssql/src/index.ts#L71)

#### Type Parameters

##### Row

`Row` = `unknown`

#### Parameters

##### query

[`AshibaMssqlQuerySource`](AshibaMssqlQuerySource.md)

##### params?

`Readonly`&lt;`Record`\<`string`, `unknown`\&gt;\>

#### Returns

`Promise`&lt;[`MssqlQueryResult`](MssqlQueryResult.md)\<`Row`\&gt;\>
</div>
