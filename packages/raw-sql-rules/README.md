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

## Scope and evidence limit

The evaluated driver model is a native named-parameter-capable driver; SQL
Server-style `@name` binding is the primary documented capability example.
Fixtures use portable `:name` notation only to make parameter meaning readable,
not as a claim of a selected live driver. This workbench does not install a
driver or claim live database execution. Its mechanical results are
source/rubric checks; human/fresh-agent judgments are recorded separately.
PostgreSQL adaptation and ORM comparisons are out of scope.

Run the local checks with `node scripts/check.mjs`.

## Distribution conclusion

Plain Markdown is sufficient for this result: link `RULES.md` from an
application's `AGENTS.md` or contributor guide. A Skill adapter would merely
duplicate the source of truth and adds no evaluated distribution value, so none
is included.
