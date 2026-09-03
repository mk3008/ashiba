# Inline comparison

A credible local PostgreSQL helper must include lexical false-positive protection, a name-to-index table, repeated-name reuse, missing/extra binding rejection, and values-only binding. That duplicates the package's 82 production lines plus relevant tests; a regex is not credible. The assurance corpus is therefore reusable, but applications should not inherit unused API generality.

No disposable inline implementation was added: copying the scanner would duplicate the implementation under evaluation. This is a limitation, not a claim that every application needs every lexical profile.
