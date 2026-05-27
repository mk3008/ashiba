<div v-pre>
# Type Alias: AshibaMssqlAdapter

> **AshibaMssqlAdapter** = `object`

Defined in: [packages/driver-adapter-mssql/src/index.ts:70](https://github.com/mk3008/ashiba/blob/fda61f5a4c9bc51bd91b12a35886f4e4f51d7ac1/packages/driver-adapter-mssql/src/index.ts#L70)

Thin mssql adapter interface exposed to application code.

## Methods

### execute()

> **execute**&lt;`Row`\&gt;(`query`, `params?`): `Promise`&lt;[`MssqlQueryResult`](MssqlQueryResult.md)\<`Row`\&gt;\>

Defined in: [packages/driver-adapter-mssql/src/index.ts:71](https://github.com/mk3008/ashiba/blob/fda61f5a4c9bc51bd91b12a35886f4e4f51d7ac1/packages/driver-adapter-mssql/src/index.ts#L71)

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
