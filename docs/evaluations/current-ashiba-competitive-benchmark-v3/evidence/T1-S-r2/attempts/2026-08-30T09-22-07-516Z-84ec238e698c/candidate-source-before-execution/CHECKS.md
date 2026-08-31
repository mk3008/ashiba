# Local checks

All commands were executed from this candidate directory without accessing a
database connection string.

| Command | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm run build` | passed; emits `dist/application.js` |
| ESM entrypoint smoke check | passed: invalid input returns `VALIDATION`; a post-close transfer returns `APPLICATION_CLOSED` |

No `test` script or candidate test files were supplied in the initial packet.

Generated file SHA-256: `src/generated/transfer_sql.ts`
`71940d3eb7c7bdc9f5dba2969708e75b1e630def59314484954013b9db3c867a`.
