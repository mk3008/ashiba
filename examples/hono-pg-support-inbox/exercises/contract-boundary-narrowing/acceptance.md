# Acceptance: Contract Boundary Narrowing

## Functional Acceptance

- The `/tickets` request path still works with empty filters.
- Optional text filters accept `string` or `null` at the feature/query boundary.
- `limit` and `offset` are numbers at the feature/query boundary.
- Invalid raw input still fails at `parseRequest(raw: unknown)`.

## Implementation Acceptance

- `ListTicketsQueryParams` no longer exposes `unknown` for request parameters.
- `SupportInboxRequest` remains the feature-owned request contract.
- `parseRequest(raw: unknown)` still treats external input as untrusted.
- The boundary test uses realistic typed params instead of `"value"` for numeric fields.
- A test covers invalid numeric input.
- SQL text, query metadata, and mapper generated assets are not changed by this exercise.

## Verification Commands

The reference patch should be verified with:

```powershell
pnpm --dir examples/hono-pg-support-inbox typecheck
$env:ASHIBA_TEST_DB_PORT='55433'; Remove-Item Env:ASHIBA_TEST_DATABASE_URL -ErrorAction SilentlyContinue; pnpm --dir examples/hono-pg-support-inbox test
```
