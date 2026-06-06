---
"@ashiba-ts/cli": minor
"@ashiba-ts/driver-adapter-core": minor
"@ashiba-ts/driver-adapter-pg": minor
---

Teach SSSQL optional-condition metadata to include a present-parameter replacement range, and update the PostgreSQL adapter to prune only the null guard when the parameter is provided.

For example, `(:keyword is null or users.email ilike '%' || :keyword || '%')` still removes the optional branch when `keyword` is null, but now executes as `users.email ilike '%' || $1 || '%'` when `keyword` is present.
