<div v-pre>
# Function: normalizeError()

> **normalizeError**(`error`): `object`

Defined in: [packages/driver-adapter-core/src/index.ts:180](https://github.com/mk3008/ashiba/blob/887798dd82defe2a1a86ca1387fc0647d15ba5d2/packages/driver-adapter-core/src/index.ts#L180)

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
