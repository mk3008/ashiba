# Evaluation runner notes

The three candidate runs were intentionally isolated fresh consumers. Candidate
A used the repository reference as an implementation evidence source; B used a
public packaged CLI; C used packed tarballs and package-local help/README.

No consumer fixture is committed because the fresh directories contain installed
third-party dependencies and evaluation-local failures. Exact outcomes and
commands are preserved in `../raw-results.json` and the comparison report.

The final A verification command is:

```bash
pnpm --filter postgres-ticket-queue-reference db:up
pnpm --filter postgres-ticket-queue-reference verify
```

In this run Docker daemon 27.3.1 could not allocate the compose network because
all predefined address pools had been fully subnetted. The evaluation created a
separate explicit temporary subnet instead; Candidate A verification passed, and
the temporary network/container were removed afterwards. No existing Docker
network/container was removed or reused.
