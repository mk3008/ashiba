# E1-A-r1 treatment-removal record

- Removed dependency: `@ashiba-ts/named-parameters` from `package.json` and
  `package-lock.json`.
- Removed execution treatment: the application no longer compiles or binds
  named parameters. Every database operation now calls native `pg` with a
  static PostgreSQL `$1`-style statement and its values array.
- Generated/configuration state: no named-parameter generator or configuration
  file exists in the candidate. `dist/application.js` was regenerated from the
  edited TypeScript source with the existing `npm run build` command.
- Commands: no package script was removed or added. The former in-process
  compile/bind calls were replaced by direct `pool.query` / `client.query`
  calls. Local verification used `npm ci`, `npm run typecheck`, and `npm test`.
