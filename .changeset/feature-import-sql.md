---
"@ashiba-ts/cli": minor
---

Add `ashiba feature import <feature> <query> --sql <path>` to scaffold a feature boundary, query DTO contracts, metadata, and ZTD mapper-test assets around an existing SQL file.

Generated mapper tests now use lightweight synthetic DB result probes so they prove DTO mapping compatibility without pretending to prove source SQL business logic.
