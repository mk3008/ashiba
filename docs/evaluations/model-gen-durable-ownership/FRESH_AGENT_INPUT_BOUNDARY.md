# Fresh-agent input boundary

Arm B tests the public named-parameter primitives without teaching the
`model-gen` workflow. The candidate is created outside the repository in a new
clean directory.

## Available inputs

- one packed `@ashiba-ts/named-parameters` tarball;
- normal npm registry dependencies;
- frozen PostgreSQL DDL and business acceptance;
- the consumer guidance and concise consumer prompt committed under
  `evaluation/arm-b-input/`; and
- separate evaluation-only harness instructions.

## Deliberately absent

- the Ashiba repository and its source;
- `@ashiba-ts/cli` and its command catalog;
- existing VSA, layered, Ticket Queue, Support Inbox, evaluation, and prior
  candidate files;
- instructions to create committed binding metadata, source hashes, or a
  freshness check.

The harness fixes behavioral acceptance and a small exported application API
for independent verification. It does not prescribe whether the candidate
should compile SQL at startup/build time, write an application-owned static
artifact, or use another small application-local mechanism.

## Equal behavioral authority

Both arms must pass strict TypeScript, native `pg`, visible canonical SQL,
named value binding, missing/unused rejection, hostile value isolation,
filters, finite reviewed sorting with stable ties, pagination, get, and a
native transaction with a rollback negative case. A runner-owned PostgreSQL
oracle checks behavior independently of candidate tests.
