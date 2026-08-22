# Application requirements

The domain is an internal work-item queue. A work item belongs to a customer,
has a human-readable name, a priority (`urgent`, `normal`, or `low`), and may
have no assignee. The API's input contract is language-independent.

## Search semantics

For each optional property (`assignee`, `customerId`):

| Input state | Required meaning |
| --- | --- |
| property omitted / not supplied | Do not apply that predicate. |
| property explicitly `null` | Search for SQL `NULL`. |
| property has a concrete value | Compare using a bound runtime value. |

`undefined`, `null`, and a value may represent these states in TypeScript, but
the three-state contract is not TypeScript-specific.

## Ordering capability

Only these reviewed capabilities are allowed. Any other key or direction is a
rejected application input, never SQL text.

| Key | Direction | Meaning | Stable tie-breaker |
| --- | --- | --- | --- |
| `createdAt` | `asc`, `desc` | Creation-time queue order | `id ASC` |
| `name` | `asc`, `desc` | Alphabetical work-item name | `id ASC` |
| `priority` | `asc`, `desc` | Business rank: urgent=1, normal=2, all other values=3 | `id ASC` |

Pagination requires a positive `limit` no larger than 50 and a non-negative
`offset`. These are bound values, not syntax.

## Operations

- Look up one work item by BIGINT id, including an optional customer name from
  a `LEFT JOIN`.
- Search with the stated three-state filters.
- List with the finite ordering capability and pagination.
- Create/update and return the affected row.
- Claim one ready item concurrently: exactly one claimant may receive an item.
- Record a claim audit row inside the same application-owned transaction. Audit
  context is PostgreSQL `jsonb` and must contain a `source` property; a failed
  audit must roll back the claim.
- Use PostgreSQL `FOR UPDATE SKIP LOCKED` for claim concurrency and `jsonb`
  context for audit data.
