# Remaining Change-Safety Surface Reduction

Starting SHA: `6fed8cb35af57f94cd18cbd59f846e7a4d11e140`.

## Outcome

This implementation applies the approved **REDUCE** decision without changing
the Golden Path, Scope, or DBMS positioning.

| Surface | Before | After |
| --- | --- | --- |
| `gate scaffold` | CLI command that wrote package scripts, CI YAML, and a Git hook | Removed; applications own those project-local files. |
| `@ashiba-ts/ddl-pull-pg-dump` | Public thin `pg_dump` process wrapper | Removed; applications invoke native `pg_dump` or a project-local script. |
| `ddl migration generate` | Optional DDL snapshot diff and risk rendering | Retained unchanged. |
| `sql-resource snapshot` / `compare` | Optional fleet-level SQL resource artifact and comparison | Retained unchanged. |

## Consumer reconfirmation

The current-source census found no product, CI, example, dogfood, or Transfer
consumer for either removed surface. This implementation does not claim an
external-adoption census. `gate scaffold` was
reachable only through its registration, command catalog, implementation, and
root README promotion. `ddl-pull-pg-dump` was reachable only through its own
package files and the workspace lockfile importer. Workspace membership was not
a product consumer.

The only unrelated `pg_dump` reference is an input filter in detached
`ddl-docs-cli`; it does not import or require the removed package.

## Removed surface

`gate scaffold` no longer registers a command or publishes its catalog entry.
The removed implementation and public types covered `all`, `package-scripts`,
`github-actions`, and `git-hooks` targets, including generated `ashiba:check`,
`ashiba:verify`, CI workflow, and pre-push-hook content. `project check` is a
separate retained command and remains unchanged.

The complete `@ashiba-ts/ddl-pull-pg-dump` package was removed: source API,
public types/errors, README, changelog, tests, TypeScript/Vitest configuration,
and lockfile importer. No forwarding package, deprecated alias, or generic
process wrapper was added.

## Migration boundary

[`docs/guide/change-safety-migration.md`](../../guide/change-safety-migration.md)
documents the intentional breaking removal. Applications own package scripts,
CI, hooks, native `pg_dump` flags/output paths/credentials, and any local
wrapper. They can call retained Ashiba checks directly where useful.

Ashiba still provides `ddl migration generate` for reviewable DDL diff/risk and
`sql-resource snapshot` / `compare` for optional SQL resource comparison. It
does not apply migrations, own deployment credentials, or manage project gate
lifecycle.

## Dependency graph

Before:

```text
CLI → gate scaffold → project-local scripts / CI / hooks
workspace → ddl-pull-pg-dump → native pg_dump
```

After:

```text
application / repository → project-local scripts / CI / hooks → retained Ashiba checks
application / repository → native pg_dump
CLI → ddl migration generate | sql-resource snapshot / compare
```

## Verification

Local verification results and remote CI status are recorded in
`raw-results.json`. Focused retained command tests, project check, command
catalog inspection, repository verification, documentation build, publish and
consumer-install checks are included. The change has no native execution or
database-runtime behavior, so no local live database was altered; the PR CI
live jobs are the remote confirmation.

## Invariants and limitations

- Scope change required: no.
- Golden Path changed: no.
- DBMS positioning changed: no. PostgreSQL/pg remains PRIMARY; MySQL/mysql2
  and SQL Server/mssql remain SUPPORTED-SECONDARY.
- Named parameters, model generation/freshness, narrow DDL-backed lint, query
  uses, native-driver execution, and standalone PostgreSQL contract are
  unchanged.

This removal deliberately loses Ashiba-owned setup convenience and redacted
`pg_dump` command-preview helpers. It does not remove a deterministic
change-safety proof: neither removed surface supplied one beyond the native or
project-local mechanism it invoked.
