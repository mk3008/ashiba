# Minimum Ashiba reference application

This durable fixture is a small PostgreSQL work-item application used to test
the post-PR #62 candidate boundary in an ordinary application shape. It is not
a product sample or a removal proposal.

Start here, in order:

1. [Application requirements](./application-requirements.md)
2. [Candidate contract](./candidate-contract.md)
3. [Review packet](./review-packet.md)
4. [Machine proof summary](./results.json)
5. [Reproduction](./reproduce.md)

The `app/` directory intentionally uses `pg` and the local `named-lowering.mjs`
only. It does not import an Ashiba driver adapter.
