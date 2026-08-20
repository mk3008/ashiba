# AI-native construction fixtures

These fixtures are workload contracts for the construction pilot. They are not
Ashiba examples and they do not prescribe a scaffold, directory layout,
framework, ORM, repository abstraction, or generated artifact. A fresh agent
may choose the application language and architecture, provided that the
resulting application exposes the observable behavior and evidence described
by the selected task.

The pilot runner supplies a disposable PostgreSQL database and a clean working
directory. It must preserve the starting schema/data for each run and must
record the agent's prompt, commands, files read, files changed, validation,
retries, and any human intervention. Tokens are recorded only when the
execution surface reports them.

## Workloads

- [Greenfield](greenfield-task.md) asks the agent to build a small order-desk
  application from an empty application directory.
- [Brownfield](brownfield-task.md) asks the agent to add an order-queue
  feature to an existing layered application whose structure and coding style
  must be retained.
- [Verification guidance](verification.md) defines implementation-independent
  static checks and deterministic PostgreSQL behavior checks.
- [Condition prompts](prompts.md) combines either task with exactly one of
  the A/B/C tool conditions.

## Common fairness rules

The task text and verification matrix are immutable across A, B, and C for a
given workload. Only the tool-availability instruction changes. The agent is
not told that a generator is the treatment under evaluation, and the fixture
does not reward a particular file count or architecture.

An implementation is eligible for a `done` result only when it satisfies the
behavioral checks and the reviewer can identify the canonical SQL, bound input
boundary, transaction boundary, and raw-row-to-application type boundary. A
passing test alone is not evidence when the test does not exercise the
PostgreSQL behavior or can be satisfied by a mock.
