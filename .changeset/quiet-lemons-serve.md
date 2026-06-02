---
"@ashiba-ts/cli": patch
---

Fix the CLI version output and make `ashiba init --db postgres --driver pg` add `"type": "module"` when an npm-initialized package does not declare a module type, so generated `import.meta` based starter code typechecks without manual package metadata edits.
