<div v-pre>
# Type Alias: AshibaPostgresAdapter

> **AshibaPostgresAdapter** = `object`

Defined in: [packages/driver-adapter-pg/src/index.ts:89](https://github.com/mk3008/ashiba/blob/fda61f5a4c9bc51bd91b12a35886f4e4f51d7ac1/packages/driver-adapter-pg/src/index.ts#L89)

Thin PostgreSQL adapter interface exposed to application code.

## Methods

### execute()

> **execute**&lt;`Row`\&gt;(`query`, `params?`, `options?`): `Promise`&lt;[`NodePostgresQueryResult`](NodePostgresQueryResult.md)\<`Row`\&gt;\>

Defined in: [packages/driver-adapter-pg/src/index.ts:90](https://github.com/mk3008/ashiba/blob/fda61f5a4c9bc51bd91b12a35886f4e4f51d7ac1/packages/driver-adapter-pg/src/index.ts#L90)

#### Type Parameters

##### Row

`Row` = `unknown`

#### Parameters

##### query

[`AshibaPostgresQuerySource`](AshibaPostgresQuerySource.md)

##### params?

`Readonly`&lt;`Record`\<`string`, `unknown`\&gt;\>

##### options?

[`AshibaPostgresExecuteOptions`](AshibaPostgresExecuteOptions.md)

#### Returns

`Promise`&lt;[`NodePostgresQueryResult`](NodePostgresQueryResult.md)\<`Row`\&gt;\>
</div>
