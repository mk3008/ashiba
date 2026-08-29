# Distribution proof

`pnpm verify:npm-distribution` builds public packages, makes publish-shaped
tarballs, installs only those tarballs with npm in a temporary clean directory,
then runs model generation, freshness checking, TypeScript checking, and a
native named-binding hostile-value smoke test. It also rejects lockfiles that
refer to a workspace path.

The repository uses `workspace:*` internally. A raw workspace pack is not
acceptable npm evidence because npm cannot install that protocol from a tarball.
The proof therefore materializes the manifest shape that pnpm publishing
produces (the internal dependency becomes the packed released version), then
checks the resulting tarballs. The script removes its temporary directory in a
`finally` block.

CI runs the proof on Node 22/npm 10 and Node 24/npm 11. Full primary
verification runs on Node 24; existing database jobs remain their focused,
non-duplicated coverage.
