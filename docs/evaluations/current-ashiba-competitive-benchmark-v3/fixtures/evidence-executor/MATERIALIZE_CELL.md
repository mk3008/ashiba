# Primary cell materialization

`materialize-cell.mjs` creates one fresh, candidate-visible directory outside
the Ashiba worktree. It copies only the arm's frozen package manifest/lock,
the common API/schema/seed/Q1 files, exact prompt packet, and the archived
official documentation packet. It does not create solution source or edit a
candidate after materialization.

For Arm A it supplies an identical copy of the frozen tarball under the clean
room's `artifacts/` directory and rewrites only the relative `file:` reference.
The runner accepts that reference only when its SHA-256 and package identity
match the frozen supplied artifact. All workspace/link/symlink references still
fail static inspection.

```powershell
node materialize-cell.mjs --cell G1-A-r1 --destination C:\tmp\benchmark-cell --npm C:\path\to\npm.cmd --install
```

`--install` performs `npm ci --ignore-scripts` from the copied frozen lock.
The command's child process receives only ordinary OS/npm variables; it is not
a candidate execution and does not receive a database credential.
