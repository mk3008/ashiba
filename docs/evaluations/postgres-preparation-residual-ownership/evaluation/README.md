# Evaluation Method

This directory intentionally contains no new runtime harness. The question is
residual package/capability ownership after an already verified migration, not
a new performance or database-behavior experiment.

The evaluation method is reproducible repository inspection:

1. inspect `driver-adapter-pg` and `driver-adapter-core` exports and package
   metadata;
2. search imports and generated-artifact consumers, separating Support Inbox
   from detached Transfer;
3. compare each claimed guard with its smallest existing alternative;
4. cite the retained negative-control evidence in current focused tests and
   `docs/evaluations/dynamic-mechanism-value-ablation.md`; and
5. run the focused package/CLI tests recorded in `../raw-results.json`.

No credential, database, generated bulk data, or temporary source file is
committed. Phase 2 live proof is cited as historical repository evidence rather
than rerun because this branch changes no runtime behavior.
