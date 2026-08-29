# Self Review

## Source request

Decide durable product ownership for optional-condition compression without
changing product behavior, package topology, generated formats, Scope, or the
Golden Path.

## Cycle 1 — consistency review

| Finding | Triage | Resolution |
| --- | --- | --- |
| Treat stale-coordinate rejection as real rather than dismissing it because tests exist. | blocker | Failure matrix explicitly records this unique early proof and its loss on removal. |
| Do not treat that proof as business-semantic or runtime-outcome proof. | blocker | Report separates early structural failure from application/live behavioral authority. |
| Do not retain adapters merely to host one pending capability. | blocker | Decision removes the capability and documents package/core impact. |
| Do not count detached Transfer as Ashiba product adoption. | blocker | Consumer census classifies Transfer separately. |
| Do not turn nullable guards into an Ashiba-specific replacement DSL. | blocker | Migration boundary allows ordinary SQL guards or visible application variants only. |
| Current Scope document link is missing on main. | follow-up | Recorded as a documentation limitation; no Scope inference or rewrite is made. |

## Cycle 2 — human acceptance review

| Finding | Triage | Resolution |
| --- | --- | --- |
| Reviewer needs one explicit decision. | resolved | Decision opens with `REMOVE`. |
| Reviewer needs early-proof/value trade-off before package detail. | resolved | Report and failure matrix state both sides before migration. |
| Reviewer needs evidence that current consumer is not ignored. | resolved | Census enumerates Support Inbox, Transfer, tests, and metadata-only files. |
| Reviewer needs a bounded next implementation. | resolved | Decision limits follow-up to compression removal and excludes named/contract/DBMS work. |
| Reviewer needs guarantee limits. | resolved | Medium evidence and known limitations are explicit. |

## Retro gate

`tmp/RETRO.md` is absent. No open or accepted-defer retro item blocks this PR.

## Review readiness

**Ready for human review**, subject to remote CI completion. No product-owner
decision blocker remains: the existing evidence supports removal more strongly
than durable productization.
