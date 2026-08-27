# Evaluation Method

Evidence was taken from package manifests, public CLI command catalog and
descriptors, source write/check paths, package and repository references, recent
Golden Path/DBMS/distribution/verification evaluations, examples and CI
configuration. README claims were treated as public-promise evidence only.

No destructive ablation was executed. The audit found that Groups A and B are
not Golden-Path dependencies, but package adoption and generated consumer
repositories are unknown. Deleting a public package/command before a
compatibility census would not be a valid throwaway experiment. The reduction
plan therefore makes their first actual ablation a separate, major-version,
reversible task.
