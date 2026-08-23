# S2 current Safe Sort mechanism

Current `model-gen` converts a parsed source insertion range into a PostgreSQL
compiled insertion coordinate by compiling the source prefix. Runtime Safe Sort
then validates the source hash, requires the generated coordinate, renders only
the reviewed sort profile, and mechanically splices the resulting `ORDER BY` at
that coordinate. It does not discover an insertion location by lexing at each
execution.

This adds three properties over S1's application dictionary alone: generated
source/compiled coordinate agreement, stale metadata rejection, and a shared
profile/placement boundary. It does not define the application's allowed keys,
directions, sequence length, or business CASE semantics; those remain
application requirements.
