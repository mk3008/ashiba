# AF clean-room materialization

The materializer creates a candidate-private copy. It deliberately does not
copy the primary runner, benchmark repository, prior candidate output, or the
trusted baseline manifest.

For arm A, the materializer copies the frozen packed named-parameters tarball
into the cell's sibling `artifacts/` directory and rewrites only the relative
file reference in the already-frozen arm package/lock. This is the same
tarball-only treatment used by primary Arm A; it is not a workspace link.

The candidate receives:

* its arm's exact package manifest and lock;
* its frozen architecture skeleton under `candidate/`;
* a private packet with the common API, DDL, seed, G1 assignment, arm
  assignment, official-source snapshot and architecture assignment;
* its own npm cache and evidence root.

The skeleton has no generated code and no prescribed data-access framework.
It is a supplied application boundary, not a tool framework. A candidate may
edit skeleton source to implement the feature; the runner compares that result
with its independent, immutable baseline manifest.
