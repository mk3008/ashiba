# Frozen vertical-slice baseline

This is a runner-owned ordinary TypeScript vertical-slice application boundary.
The candidate receives a copy of the source tree but not the trusted hash
manifest. It may implement the G1 feature in the indicated ticket slice.

The supplied `Pool`, transaction helper, DTO seam and integration-test seam
are deliberately simple application code. They do not require an Ashiba,
ORM, query-builder or repository framework.
