# Maintenance Surface Comparison

| Option | Value | Maintenance and failure burden |
| --- | --- | --- |
| A. Current Ashiba named abstraction | common source identity; driver rendering; missing/unused pre-execution rejection; generated binding freshness | public package/API, compiler scanner/renderers, binder, generated metadata, CLI/docs/tests, selected-driver regression probes |
| B. Driver named where supported + Ashiba fallback | delegates mysql2 conversion and mssql binding | retains fallback/compiler/binder for pg; adds mixed canonical policy and migration complexity; does not remove unused guard need for named drivers |
| C. Driver-native by dialect | eliminates Ashiba lowering for plain execution | pg ordered-value discipline; divergent syntax/docs; drivers leave surplus values silent on named routes; coordinate/contract questions remain |
| D. Driver-native + new guard | can restore selected safety | risks replacing named compiler with positional manifest/comment parser/callsite verifier—surface migration, not reduction |

Option A has real maintenance. Its durable value is not convenience alone: the selected primary driver lacks meaningful names, and the binder is the only evaluated common unused-value guard. Option B is tempting for mysql2/mssql but leaves a more complex product policy while retaining the primary hard case. Option C reduces some code only if other metadata dependencies also vanish; current evidence does not establish that. Option D is explicitly outside this evaluation and would not count as simplification without a new durable-value case.

Cross-driver syntax diversity is a cost in driver-first designs, but it is not enough on its own to retain Ashiba. The decision rests on the observed safety gap and residual dependency graph.
