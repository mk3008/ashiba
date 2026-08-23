# Decision log

## 2026-08-23 — registration

- Observed problem: #62/#63 show that named SQL and a small application runtime
  can work, but do not measure whether runtime lexical lowering, optional
  predicate subtraction, multi-column ordering, or an adapter are necessary.
- Original assumption: PostgreSQL live evaluation can compare independent N, O,
  and S mechanisms before judging the driver boundary.
- Evidence: merged baselines `39207a1` and `d7566aa`, plus current source.
- Protocol change: none.
- Previous runs validity: not applicable.
- Calibration / invalid classification: none.
- Effect on comparability: dataset and oracle will be frozen before scoring.

## 2026-08-23 — lexical corpus calibration found nested-comment misclassification

- Observed problem: the current development-time `compileNamedParameters`
  scanner emitted `not_a_parameter` from the registered nested block comment.
- Original assumption: the current compiler handled every lexical case required
  by the registered PostgreSQL corpus.
- Evidence: `named-parameter-evaluator.mjs` imported the built current compiler
  and received `['id', 'id2', 'id', 'not_a_parameter']` before reaching later
  assertions.
- Protocol change: preserve this as a failing N1/current-compiler evidence case;
  do not silently repair the scanner before recording the result. Subsequent N2
  comparisons distinguish a correctly generated artifact from this current
  compiler limitation.
- Previous runs validity: no scored named-binding result existed.
- Calibration / invalid classification: this is lexical calibration, not a
  completed N-treatment score.
- Effect on comparability: the corpus is frozen; every named-binding candidate
  must handle this same nested-comment case or be reported partial.

## 2026-08-23 — dataset freeze after calibration

- Observed problem: a dataset must show index/bitmap work without making the initial run impractical.
- Original assumption: 200k rows are sufficient to show selective index work.
- Evidence: rare customer/status queries produced two-index BitmapAnd and a Bitmap Heap Scan with 2,000 actual rows; the runner completed locally.
- Protocol change: freeze 200k rows, the recorded 1% skew, and three indexes for subsequent scored plan comparisons.
- Previous runs validity: the first plan capture is calibration only.
- Calibration / invalid classification: no O-treatment winner is declared.
- Effect on comparability: later O1/O2/O3 cases use this size and schema.

## 2026-08-23 — canonical escape-string fixture correction

- Observed problem: psql rejected the registered escape-string line before any named-binding behavior, because the quote/backslash sequence closed the literal too early.
- Original assumption: every corpus line was executable PostgreSQL.
- Evidence: psql reported syntax error at `:not_a_parameter` on the escape-string line.
- Protocol change: repair only that literal so the colon remains inside an executable escape string; rerun lexical and psql checks.
- Previous runs validity: the earlier nested-comment compiler failure remains valid because it occurs later in a different lexical region.
- Calibration / invalid classification: the first psql attempt is fixture calibration only.
- Effect on comparability: the repaired corpus becomes the frozen executable source for all later checks.

## 2026-08-23 — quoted identifier fixture correction

- Observed problem: the corpus used a colon-bearing quoted identifier as an expression, but the subquery did not define that column.
- Original assumption: lexical coverage text was also executable SQL.
- Evidence: psql reported that the quoted identifier did not exist.
- Protocol change: retain the same quoted identifier as a result alias for an existing expression.
- Previous runs validity: compiler nested-comment evidence remains valid; psql attempts before this correction are calibration only.
- Calibration / invalid classification: not a mechanism failure.
- Effect on comparability: all subsequent execution checks use an executable lexical corpus.
