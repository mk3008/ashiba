<div v-pre>
# Function: normalizeError()

> **normalizeError**(`error`): `object`

Defined in: [packages/driver-adapter-core/src/index.ts:180](https://github.com/mk3008/ashiba/blob/b3cc51a9a44af221919513ce768f20a3693ebb59/packages/driver-adapter-core/src/index.ts#L180)

Convert unknown thrown values into the structured error shape used by driver events.

## Parameters

### error

`unknown`

## Returns

`object`

### name

> **name**: `string`

### message

> **message**: `string`

### code?

> `optional` **code?**: `string`

### cause?

> `optional` **cause?**: `string`

### nextAction?

> `optional` **nextAction?**: `string`
</div>
