# Inline comparison

A credible local PostgreSQL helper was completed at `evidence/inline/helper.ts` and tested by `helper.test.ts` (`INLINE_HELPER_PASS`). It has 39 production lines, two local functions (`compile`, `bind`), and scanner states normal/single/double/line/block/dollar. It handles repeated names, missing/extra rejection, ordinary strings, quoted identifiers, comments, dollar quotes, and `::` casts. Values remain separate.

It intentionally omits nested comments, PostgreSQL escape-string backslashes, configurable syntax/rendering, anonymous output, and every non-PostgreSQL lexical profile. The application would own those omissions, plus regression maintenance and every later lexical fix. The local advantage is narrower scope; the shared advantage is a reusable broader assurance corpus and cross-driver anonymous support.
