<div v-pre>
# Type Alias: Mysql2Queryable&lt;Row\&gt;

> **Mysql2Queryable**&lt;`Row`\&gt; = `object`

Defined in: [packages/driver-adapter-mysql2/src/index.ts:29](https://github.com/mk3008/ashiba/blob/887798dd82defe2a1a86ca1387fc0647d15ba5d2/packages/driver-adapter-mysql2/src/index.ts#L29)

Minimal mysql2-compatible client or pool contract.

## Type Parameters

### Row

`Row` = `unknown`

## Methods

### execute()

> **execute**(`sql`, `values`): `Promise`&lt;[`Mysql2QueryResult`](Mysql2QueryResult.md)\<`Row`\&gt;\>

Defined in: [packages/driver-adapter-mysql2/src/index.ts:30](https://github.com/mk3008/ashiba/blob/887798dd82defe2a1a86ca1387fc0647d15ba5d2/packages/driver-adapter-mysql2/src/index.ts#L30)

#### Parameters

##### sql

`string`

##### values

readonly `unknown`[]

#### Returns

`Promise`&lt;[`Mysql2QueryResult`](Mysql2QueryResult.md)\<`Row`\&gt;\>
</div>
