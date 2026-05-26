# Development Notes

Ashiba is currently an early monorepo worktree with ConceptSpec-led documentation, VitePress review pages, and initial Ashiba packages for CLI, SQL binding, DDL diff/pull, error formatting, and PostgreSQL driver-adapter seams.

## Product Baseline

Ashiba is a rebrand of `rawsql-ts/packages/ztd-cli`.

Use `https://github.com/mk3008/rawsql-ts/tree/main/packages/ztd-cli` as the baseline for understanding the current product behavior, package shape, CLI surface, scaffolding workflows, and migration plan. Ashiba should preserve that baseline unless an approved Ashiba Concept Spec intentionally changes the direction.

## Local Setup

- Primary branch source: `main`
- Active development branch: `codex/ashiba-dev-env`
- Repo-local guidance: `AGENTS.md`
- Developer workflow guidance: `.codex/agents/`
- Copied developer skills: `.agents/skills/`

The workspace now uses pnpm. Current verification commands are:

- `corepack pnpm build`
- `corepack pnpm test`
- `corepack pnpm docs:build`

## ConceptSpec Workflow

Use the copied `rawsql-ts` workflow guidance as the local development baseline:

- Plan work with explicit source request, acceptance items, verification methods, assumptions, and decision points.
- Review Concept Specs as stable concept constraints owned by humans.
- Use DFDs for business operation, timing, actor, input/output, and boundary clarity.
- Use Process Maps when complex flows, branching, duplicate prevention, auditability, history, or state transitions need to be proven from Concepts.
- Keep implementation design separate from Concept Specs unless explicitly requested.

## Copied Skills

The following `rawsql-ts` developer skills were copied into `.agents/skills/` and also installed in the user Codex skills directory under their `developer-*` names:

- `developer-acceptance-planning`
- `developer-attainment-reporting`
- `developer-pr-readiness`
- `developer-pre-pr-retro-gate`
- `developer-retro-capture`
- `developer-self-review`
