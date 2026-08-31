# E1 runner API

The exit candidate exports the unchanged G1 `createApplication(runtime)` API.
The runner accepts a baseline manifest and repeated `--forbidden <regex>`
arguments. These patterns are frozen in the arm's exit packet before the cell
begins; they identify treatment imports, commands, and generated-state markers
that must no longer be present. The patterns are an inspection boundary, not a
substitute for treatment review.

The result contains the immutable baseline manifest/hash, exit source
manifest/hash, added/removed/changed files, matched forbidden markers, final
G1 runner result, runner-owned pre-cleanup database state, and cleanup status.
It records dependencies and generated/configuration paths observed in the
source manifests. It never modifies the candidate source.
