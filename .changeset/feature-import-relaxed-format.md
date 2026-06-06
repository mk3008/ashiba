---
"@ashiba-ts/cli": patch
---

Allow `ashiba feature import` to keep safe formatter output when formatting only normalizes SQL syntax, such as adding explicit `AS` to source aliases. The import safety check still rejects formatting that would drop SQL comments, change named parameters, or fail an AST round-trip check.
