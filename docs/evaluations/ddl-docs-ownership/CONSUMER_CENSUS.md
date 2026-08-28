# Consumer Census

## Current consumers

| Consumer | Classification | Use |
|---|---|---|
| `scripts/generate-transfer-docs.mjs` | Transfer-only | Calls `concept-site`, `structured-concept build`, `check`, `review-plan`, and `generate` with Transfer paths and policies. |
| `package.json` `docs:transfer` / `docs:build` | Repository integration for Transfer dogfood | Builds the package then runs Transfer generation. |
| `package.json` `verify:transfer-ddl-metadata` / `verify:transfer-docs` | Transfer-only verification | Builds the package then executes Transfer metadata check and generated-doc drift checks. |
| Package tests and minimal example | Package-local | Preserve generic package behavior, not a separate product consumer. |

No other package, example, or current Ashiba CLI imports the package. No
external adoption census is needed: the package is private.

## Root build coupling

`docs:build` currently performs `docs:transfer`, so a product documentation
build owns Transfer-specific review-site generation. That is useful dogfood
visibility, but it is not evidence for a published Ashiba product boundary.

## Classification

All non-test current consumers are Transfer-only or repository integration for
Transfer dogfooding. No repository-wide Ashiba product consumer was found.
