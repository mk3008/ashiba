# V5 bootstrap versus steady-state preregistration

V4 is retained as an inconclusive completion-contract result. V5 asks a
different question: what is the smallest useful database-backed regression path
when none exists, and whether one visible example supplies enough repository
context for later ordinary changes.

Rule 8 and the Rules v3 hash are frozen. No completion contract, framework,
testkit, helper, or Rules amendment is part of the steady-state treatment.

## Bootstrap

The bootstrap fixture has canonical DDL, SQL assets, mysql2, and a discoverable
disposable MySQL 8.4 endpoint, but no database-backed test. The bootstrap task
adds a status-filtered work-item SELECT and establishes one reusable regression
path. It is assessed for: target DB/native driver, actual SQL asset, canonical
DDL use, representative data, meaningful behavior assertion, relevant runtime
representation, repeatable command, and no broad infrastructure.

The agent receives the short bootstrap instruction from the PR review verbatim.

## Steady state

Freeze the successful bootstrap candidate as visible repository context. Two
ordinary fresh-change tasks receive only RULES.md, the repository fixture, and
their goal. One changes a constraint-sensitive INSERT; one changes a SELECT
result whose mysql2 runtime representation matters. The primary observation is
whether each reuses or extends the existing DB-backed pattern without new
infrastructure.

This is a compact qualitative study. It cannot establish universal behavior.
