# Layered Fresh Agent result

## Result

**PASS.** A separate fresh Luna worker built a strict TypeScript simple layered ticket application from the packed public package and the layered prompt.

- Candidate checks: `npm run typecheck`, `npm test`, and `npm run build` passed.
- Candidate tests: 4 passed.
- Runner PostgreSQL oracle: passed.
- Direct compile/cache: SQL compiled at the data-access module boundary and cached for later binding.
- Dynamic SQL: four reviewed, visible SQL files select bounded sort behavior with an `id asc` stable tie-breaker.

## Candidate shape

The candidate used an application entry point, a data-access module, visible SQL files, and candidate tests. It used ordinary layering only: no Ashiba layer, repository pattern, unit of work, CLI, generated binding artifact, source hash, or freshness lifecycle.

## Repair disclosure

The candidate's first build encountered an ACL failure while creating `dist`. After creating that clean-room output directory, the same worker reran the build successfully. This is an environment repair, not a model retry, product repair, or an Ashiba workflow requirement.
