# Raw SQL Rules

This is a private, standalone research workbench for a small natural-language
contract for application data access. It does not ship runtime code, a SQL
loader, a framework, a CLI, or a database helper.

The authoritative contract is [RULES.md](RULES.md). The workbench tests whether
that contract is sufficiently safe, reviewable, and usable when an application
uses ordinary SQL plus a native driver with named-parameter support.

## Contents

- `RULES.md` — authoritative natural-language Rules.
- `EVALUATION_PLAN.md` — preregistered scope, pass criteria, and frozen hash.
- `scenarios/` — compact adversarial task cards and expected judgments.
- `fixtures/` — inspectable SQL/DDL examples used by the task cards.
- `evidence/` — immutable evaluation observations and amendment records.
- `scripts/check.mjs` — small deterministic structural checks; it is not a
  linter and does not prove database correctness.

## Current decision

**NOT-YET.** V3 found that Rules alone did not reliably produce real-database
regression coverage. The corrected V4 packet gave concrete MySQL fixture
details to two Rules-only and one completion-contract agent; all three created
and ran live mysql2 tests. That does not demonstrate a completion-contract
effect, and it conflicts with V3 rather than erasing it. Rule 8 remains
unchanged; the evidence is insufficient to claim reliable behavior either way.

## Scope and evidence limit

The V3 live lane uses MySQL 8.4 with `mysql2@3.22.3` and its
application-facing `namedPlaceholders: true` API. Its SQL assets use `:name`
with object bindings. Live evidence and source/rubric evidence remain separate.
PostgreSQL adaptation and ORM comparisons are out of scope.

Run the local checks with `node scripts/check.mjs`.
Run the optional local/container live lane with `pnpm test:live` from this
package after starting a disposable MySQL 8.4 instance, for example:

```sh
docker run --rm --name raw-sql-rules-mysql \
  -e MYSQL_DATABASE=raw_sql_rules \
  -e MYSQL_USER=raw_sql_rules \
  -e MYSQL_PASSWORD=raw_sql_rules \
  -e MYSQL_ROOT_PASSWORD=raw_sql_rules_root \
  -p 33306:3306 mysql:8.4
```

The defaults in `evaluation/v3/live-mysql/run-live.mjs` match that command.
Set `RAW_SQL_RULES_MYSQL_HOST`, `RAW_SQL_RULES_MYSQL_PORT`,
`RAW_SQL_RULES_MYSQL_USER`, `RAW_SQL_RULES_MYSQL_PASSWORD`, and
`RAW_SQL_RULES_MYSQL_DATABASE` to use another disposable instance.

## Distribution conclusion

Plain Markdown is sufficient for this result: link `RULES.md` from an
application's `AGENTS.md` or contributor guide. A Skill adapter would merely
duplicate the source of truth and adds no evaluated distribution value, so none
is included.
