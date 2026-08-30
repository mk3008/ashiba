# Maintenance exercise

The VSA candidate received the post-success request to add an optional status filter to `getTicket(ticketId)` and a new finite `id.desc` sort option, without an implementation recipe.

The worker changed `src/index.ts`, added `sql/list-tickets-id-desc.sql`, and extended candidate tests. It reported no new Ashiba concepts, no generated artifact, and no source freshness procedure. `npm run typecheck`, candidate tests, and build passed. The runner-owned PostgreSQL oracle passed both the existing behavior and the extra `id.desc` finite-sort check.

This exercise demonstrates a local SQL/application change rather than a second Ashiba workflow: visible SQL changed, the controlled compile/cache module changed where necessary, and ordinary tests/live oracle remained the authority.
