# V4 completion-contract experiment preregistration

V3 observed two independent goal-driven candidates that kept SQL constraints
but declared completion after mock-only tests. V4 tests one narrow hypothesis:
an explicit, short task completion contract produces representative target
database/native-driver execution more reliably than `RULES.md` alone.

## Frozen inputs

`RULES.md` remains v3 and its V3 hash remains the reference. Rule 8 is not
amended for this experiment. All candidates receive the same MySQL 8.4 fixture,
the same sort-plus-optional-filter goal, and the same available local database
connection. Arm B additionally receives only the contract below.

> Database work is not complete until changed or representative application SQL
> has been executed through the target native driver against the target database
> engine. Mock-only, static-only, or type-only verification does not satisfy
> this completion condition. If the required database environment is
> unavailable, report the work as unverified rather than complete.

## Arms and preregistered outcome

| Arm | Fresh probes | Treatment |
| --- | --- | --- |
| A | A1, A2 | `RULES.md` only |
| B | B1, B2 | `RULES.md` plus the completion contract |

The sole primary outcome is whether each candidate executes representative
changed SQL through mysql2 against MySQL before claiming completion. Candidate
source files, test output, agent final output, and read-only review are durable
evidence. A candidate that reports an unavailable database is secondary
information; it is not a pass for the primary outcome.

## Decision rule

Evidence supports the hypothesis only if every completed Arm B candidate passes
the primary outcome and Arm A repeats the omission in at least one completed
candidate. If both arms omit live verification, stop: classify the result and
do not add prose or mechanics automatically. This small experiment does not
prove a universal agent behavior claim.

## Execution correction

Before the first dispatch, `fixture/README.md` was absent. The resulting four
candidate directories remain preserved as preflight evidence but are excluded
from treatment interpretation. After adding the frozen fixture README, three
fresh corrected-packet probes ran: A1 and A2 in Arm A, B1 in Arm B. The agent
slot limit prevented a fourth corrected-packet probe. This is a protocol
deviation, so the corrected comparison may identify observations but cannot
establish the preregistered consistency claim.
