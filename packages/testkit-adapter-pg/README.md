# @ashiba/testkit-adapter-pg

Ashiba Zero Table Dependency testkit adapter for `pg`/PostgreSQL query tests.

This package keeps Ashiba starter projects on Ashiba package names while delegating the tested SQL rewrite implementation to `@rawsql-ts/testkit-postgres`.

## Install

```bash
npm install -D @ashiba/testkit-adapter-pg
```

## Usage

```ts
import { createPostgresTestkitClient } from '@ashiba/testkit-adapter-pg';
```
