# Acceptance: Add Customer Locale Column

## Functional Acceptance

- The list SQL selects `customer_locale`.
- The ticket table renders a `顧客ロケール` column.
- The seeded demo renders without `Demo is not ready`.

## Implementation Acceptance

- Generated query metadata includes `customer_locale` in result columns.
- Mapper generated assets include `customer_locale`.
- `ListTicketsQueryResult` includes `customer_locale`.
- Feature output projection includes `customer_locale`.
- Boundary tests include the new field.
- Route-level E2E coverage checks that the header appears.

## Verification Commands

The reference patch has been verified with:

```powershell
pnpm --dir examples/hono-pg-support-inbox typecheck
$env:ASHIBA_TEST_DB_PORT='55433'; Remove-Item Env:ASHIBA_TEST_DATABASE_URL -ErrorAction SilentlyContinue; pnpm --dir examples/hono-pg-support-inbox test
```
