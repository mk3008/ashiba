# C treatment packet: Brownfield regeneration

You are given five complete changed canonical SQL files in `../brownfield/`.
Regenerate fresh artifact entries from those sources; do not copy, hand-patch,
or inspect your prior artifact or any expected coordinates. The frozen schema
and application requirements remain the same. Add these five entries to your
assigned `artifact.json`, with IDs `m1-parameter-order`, `m2-add-optional`,
`m3-format-comment`, `m4-sort-case`, and `m5-cte-join`, and `sourceFile` paths
under `brownfield/`.

For M4, priority's application requirement changes to the reverse business
ordering: `case when ALIAS.priority = 'low' then 1 when ALIAS.priority =
'normal' then 2 else 3 end`. Do not leave any temporary script in the repo.
Submit through the runner after each attempt.
