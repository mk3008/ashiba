# Repository Scope

This file defines repository-wide guidance for Ashiba development.
Deeper `AGENTS.md` files take precedence when they add narrower rules without weakening completion criteria.

## Development Model

- Ashiba is a rebrand of `rawsql-ts/packages/ztd-cli`.
- Treat `https://github.com/mk3008/rawsql-ts/tree/main/packages/ztd-cli` as the product baseline for behavior, package shape, and migration planning unless a later Ashiba Concept Spec explicitly changes that direction.
- Develop Ashiba through Concept Specs before implementation work.
- Treat Concept Specs, DFDs, and Process Maps as human-owned concept harnesses, not as generated implementation plans.
- Use the user-level `concept-spec-review` skill when reviewing Concept Specs, DFDs, Process Maps, concept relationships, or conceptual consistency.
- Use the user-level `ddl-concept-process-review` skill before DDL or database relationship work that depends on Concept Specs or Process Maps.
- Use `rawsql-ts` as the reference repository for ConceptSpec workflow conventions, copied developer skills, and the current `ztd-cli` implementation baseline.

## Guidance Routing

- Use `.codex/agents/` for planning, verification, review, and reporting guidance.
- Use `.agents/skills/` for repeatable developer workflows copied from `rawsql-ts`.
- Before substantial multi-step work, read the relevant local guidance instead of relying on this root policy alone.
- Keep task-specific plans and observations in `tmp/PLAN.md`; keep durable rules in `AGENTS.md`.

## Reporting and Verification

- Reports must distinguish `done`, `partial`, and `not done`.
- Do not claim completion without verification appropriate to the task.
- If a check is not run, blocked, or environment-dependent, state the remaining gap explicitly.
- For implementation work, define acceptance items and verification methods before making broad changes.

## Repository Artifacts

- Write repository artifacts in English unless a deeper rule says otherwise.
- Keep assistant-user conversation in Japanese unless the user explicitly asks for another language.
- Keep Concept Specs above physical design. Do not push DDL, SQL shape, API routes, schemas, or file layout into Concept Specs unless that is explicitly requested as a separate design task.
