# AI-first happy path

The current guide starts after DDL/table design. A consumer copies a short,
invariant-oriented AGENTS.md sample, gives an AI agent a business goal, and
lets it discover CLI commands with `ashiba describe command --format json`.

The intended path is:

```
visible SQL with named parameters
→ generated binding metadata checked for freshness
→ bindNamedParameters
→ application-owned native driver call
→ application/live tests
```

The guide also shows a failure/repair loop: a SQL edit makes `model-gen --check`
fail; regenerate the artifact, review the diff, and rerun the check. Missing or
unused values fail before a database call. AGENTS.md is documentation only:
Ashiba neither generates it nor injects agent behaviour into an installed app.
