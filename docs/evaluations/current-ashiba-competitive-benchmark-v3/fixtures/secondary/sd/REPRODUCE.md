# Reproduction

Use a copied durable G1 candidate snapshot, not a primary candidate directory.
The primary packet remains read-only.

```text
set DATABASE_URL=<runner-admin-url>
node runner.mjs --arm A --candidate <selected-copy>/dist/application.js --source-root <selected-copy> --output <evidence>/sd.json --typecheck-command "npm run typecheck" --test-command "npm test"
```

The command fields are optional and must be frozen in the SD cell's packet
before it starts. Preserve the copied snapshot, packet hashes, command logs,
runner output, and source hash manifest before removing the temporary nonce
fixtures. The runner reports its own cleanup status.
