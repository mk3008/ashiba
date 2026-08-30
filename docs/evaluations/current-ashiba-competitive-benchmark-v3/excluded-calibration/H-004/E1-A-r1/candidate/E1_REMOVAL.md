# E1 treatment removal record

- Dependency state: removed the former placeholder-binding package from `package.json` and the root plus package entry in `package-lock.json`.
- Generated state: no generated sources, snapshots, or configuration artifacts remain for that package.
- Execution path: application queries now call `pg` directly with PostgreSQL positional parameters and value arrays.
- Commands: no package scripts invoked the removed package; `npm run typecheck`, `npm run build`, and `npm test` remain the validation and build commands.
