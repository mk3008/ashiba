# @ashiba-ts/testkit-adapter-pg

Ashiba Zero Table Dependency testkit adapter for `pg`/PostgreSQL query tests.

This package is used by Ashiba-generated PostgreSQL mapper tests. It is normally
installed with `@ashiba-ts/cli`, `@ashiba-ts/driver-adapter-pg`, and `pg` as part
of the PostgreSQL starter path.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## What This Package Owns

This package keeps Ashiba starter projects on Ashiba package names while delegating the tested SQL rewrite implementation to `@rawsql-ts/testkit-postgres`.

## Install

```bash
npm install -D @ashiba-ts/testkit-adapter-pg
```

## Usage

```ts
import { createPostgresTestkitClient } from '@ashiba-ts/testkit-adapter-pg';
```
