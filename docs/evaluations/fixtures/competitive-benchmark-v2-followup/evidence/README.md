# Durable scored-result evidence

`results.json` and the transaction/concurrency failure taxonomy are generated
from runner-owned records, not from agent self-reports. The raw per-cell
records remain in the temporary experiment directory because they contain
verbose execution details and candidate working trees. See the root
`migration-manifest.json` for the evidence boundary.
