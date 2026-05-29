<div v-pre>
# Type Alias: AshibaMysql2Adapter

> **AshibaMysql2Adapter** = `object`

Defined in: [packages/driver-adapter-mysql2/src/index.ts:69](https://github.com/mk3008/ashiba/blob/5317a339ef21a6059cc9a9048975aa34a6318dd2/packages/driver-adapter-mysql2/src/index.ts#L69)

Thin mysql2 adapter interface exposed to application code.

## Methods

### execute()

> **execute**&lt;`Row`\&gt;(`query`, `params?`): `Promise`&lt;\{ `rows`: `Row`[]; `fields`: `unknown`; \}\&gt;

Defined in: [packages/driver-adapter-mysql2/src/index.ts:70](https://github.com/mk3008/ashiba/blob/5317a339ef21a6059cc9a9048975aa34a6318dd2/packages/driver-adapter-mysql2/src/index.ts#L70)

#### Type Parameters

##### Row

`Row` = `unknown`

#### Parameters

##### query

[`AshibaMysql2QuerySource`](AshibaMysql2QuerySource.md)

##### params?

`Readonly`&lt;`Record`\<`string`, `unknown`\&gt;\>

#### Returns

`Promise`&lt;\{ `rows`: `Row`[]; `fields`: `unknown`; \}\&gt;
</div>
