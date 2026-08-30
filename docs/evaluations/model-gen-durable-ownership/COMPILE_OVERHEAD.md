# Direct compilation overhead

`evaluation/measure-compile-overhead.mjs` measured controlled-startup wall time
on Node `v22.14.0`. It warms the module first and reports medians; it is a
bounded feasibility check, not a throughput claim or a runtime-per-query
recommendation.

| Set | Median wall time |
| --- | ---: |
| one representative query | 0.0147 ms |
| eight-query VSA reference set | 0.0529 ms |
| synthetic 100-query set | 0.2213 ms |
| synthetic 1000-query set | 2.2286 ms |

The measurements do not establish a universal startup budget. They do show no
evidence that compiling a bounded reference-query set once at controlled
initialization is impractical, and even the synthetic 1000-query check remained
small in this environment. Arm C caches results; it does not compile SQL for
each query execution.

Reproduce with:

```powershell
corepack pnpm --filter @ashiba-ts/named-parameters build
node docs/evaluations/model-gen-durable-ownership/evaluation/measure-compile-overhead.mjs .
```
