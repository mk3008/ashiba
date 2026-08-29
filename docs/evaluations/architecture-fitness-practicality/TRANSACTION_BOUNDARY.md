# Transaction Boundary Assessment

Ticket Queue assignment executes the assignment and audit SQL in a caller-owned
native pg transaction. Its negative test proves that a failed audit insert rolls
back the assignment. The live verification regenerated binding artifacts and
ran PostgreSQL contract negative controls.

This is ordinary driver code. Ashiba supplies deterministic named binding; it
does not need a transaction helper.
