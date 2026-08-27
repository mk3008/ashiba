# Documentation Drift Inventory

1. **Getting Started is scaffold-first.** It presents `ashiba init`, demo DDL,
   scaffold, generated DTO/mapper boundaries and testkit dependencies before the
   smaller native-pg path. This is partially aligned as a supported alternative,
   not the measured first recommendation.
2. **Public command mismatch.** README lists `ashiba feature contract check`;
   the fresh npm CLI `0.3.0` reported `unknown command 'contract'`.
3. **Starter convergence gap.** The packaged starter leaves the default npm test
   script and fresh typecheck failed in `src/adapters/pg/pool.ts`; README's
   implied test workflow therefore did not complete in the package-only run.
4. **Primary/noisy concepts.** DTO/mapper, ZTD/testkit, scaffold, feature
   commands and adapter detail are prominent. Formatter, migration, RFBA, perf,
   query graph/outline, SSSQL and safe sort are valuable optional surfaces, not
   Golden-Path prerequisites.

No existing documentation was edited in this evaluation.
