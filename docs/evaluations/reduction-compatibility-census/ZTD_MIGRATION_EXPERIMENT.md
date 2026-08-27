# ZTD Migration Experiment

Replacement proof is a physical/application database test over the same visible
canonical SQL, owned by the application. It retains SQL behavior, parameter
safety, transaction and rollback proof; it loses generated fixture grammar,
synthetic ZTD isolation and generated TEST_PLAN/analysis assets. Removed
maintenance is the testkit dependency, wrapper/config, fixture conventions and
generated artifacts.

Fresh live conversion is **not run** because Docker is unavailable. Existing
CTE-shadowing and physical-isolation evaluations are supporting evidence only.
