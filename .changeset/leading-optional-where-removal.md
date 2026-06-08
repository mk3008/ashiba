---
"@ashiba-ts/driver-adapter-pg": patch
---

Keep the `WHERE` clause intact when optional-condition compression removes a leading optional predicate but required predicates remain.

For example, `where (:email is null or email = :email) and tenant_id = :tenant_id` now compresses to `where tenant_id = $1` when `email` is null, instead of removing `WHERE` and leaving invalid SQL.
