# E1 exit/removal control

E1 is a non-aggregate coupling observation. It starts from the immutable
durable snapshot selected under the secondary protocol, copies it to an
isolated candidate directory, and asks that candidate to remove its arm's
main data-access treatment while preserving G1 behaviour with native `pg`.
It does not assert that a low exit cost is automatically better.

The runner owns the final G1 oracle, source/diff inventory, treatment-removal
scan, pre-cleanup database state, and cleanup. It never patches the candidate.
Every baseline snapshot remains available beside the exit candidate evidence.
