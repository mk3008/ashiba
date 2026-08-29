# Consumer Census

## Current Ashiba product/dogfood consumer

`examples/hono-pg-support-inbox` has four query-source opt-ins:

| Query source | Classification |
| --- | --- |
| `list-tickets` | real multi-branch nullable-filter query; the clearest current compression consumer |
| `get-ticket-detail` | opt-in source with generated metadata; not evidence by itself of a material optional-filter rewrite |
| `create-ticket/list-customers-for-ticket` | opt-in duplicate query source |
| `list-ticket-customer-options/list-customers-for-ticket` | opt-in duplicate query source |

Support Inbox is current dogfood/reference evidence, not independent external
adoption. Its application tests and Phase 2 live proof remain the final
behavior authority.

## Detached experimental consumer

`dogfood/transfer` has one opt-in source,
`resolve-transfer-destination-definitions`. Transfer is detached experimental
product tooling and is not counted as Ashiba product retention evidence.

## Test-only consumers

* `packages/driver-adapter-pg/tests/postgres-preparation.test.ts` exercises
  compressed direct-native-pg preparation.
* `packages/cli/tests/parameter-metadata.test.ts` exercises generated ranges
  and lowered replacement text.
* Phase 2 verification recorded native pg live preparation and Support Inbox
  DB-backed routes.

## Generated-metadata-only and historical surface

Eleven current generated `query.meta.ts` files contain the metadata property:
four indicate supported/enabled compression, while the remainder record a
blocked parser capability. These stored fields are migration impact, not proof
that every query invokes compression. Historical ablations, dogfooding reports,
and old guide terminology are historical evidence and must not be counted as
current independent consumers.

## Consumer conclusion

There is one current dogfood application family and one detached experimental
consumer. That is insufficient evidence for a permanent public capability when
the same SQL behavior remains valid without runtime subtraction.
