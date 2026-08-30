Extend the ticket get query with an optional `status` guard. When status is
omitted or null, `get(ticketId)` must retain its existing behavior. When a
status is supplied, return the ticket only when it matches. Keep the current
application architecture and the established metadata-generation workflow.

Update the strict TypeScript tests and run the narrowest generation and
verification commands that demonstrate the change is correct. Report the files
changed, commands run, any stale-artifact failure encountered, and repairs.
