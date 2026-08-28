# ZTD Migration Experiment

Replacement proof is a physical/application database test over the same visible
canonical SQL, owned by the application. It retains SQL behavior, parameter
safety, transaction and rollback proof; it loses generated fixture grammar,
synthetic ZTD isolation and generated TEST_PLAN/analysis assets. Removed
maintenance is the testkit dependency, wrapper/config, fixture conventions and
generated artifacts.

Fresh scaffold/ZTD asset generation was observed from published CLI 0.3.0. The
physical replacement path was live-verified with PostgreSQL 16 through the
standalone reference: native `pg`, contract negative controls, and rollback
behavior passed. A literal rewrite of the generated ZTD case was not performed,
so fixture-complexity and line-by-line migration metrics remain unmeasured.
Existing CTE-shadowing and physical-isolation evaluations remain supporting
evidence only.
