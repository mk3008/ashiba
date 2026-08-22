# Historical W5 starting artifacts: limit of reconstruction

The exact editable W5 starting snapshots used by the Fresh Agents are **not
reconstructable from durable evidence**. The pre-execution packet did not
commit each original source tree. The temporary working tree later contained
current/tuned sources, not a verified copy of those initial source snapshots.

Therefore this directory deliberately does not present a new source tree as the
historical starter. Each arm directory preserves the durable historical facts:
the treatment declaration, expected starting behavior, and the historical
source hash where it was retained. The current runnable W5 control source is
separately stored under [`../reference/W5/implementation.mjs`](../reference/W5/implementation.mjs), so it cannot be
mistaken for the historical baseline.

The `source-inventory.json` manifest identifies the temporary source inspected
during migration and marks it `current-reference-not-historical-starter`.
