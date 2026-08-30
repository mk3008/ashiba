# E1 preregistration

Control ID: `E1`; protocol: `secondary-controls-v1`; status: non-aggregate.

For each arm with a final-live, strict-treatment G1 pass, select the candidate
with the fewest candidate/tool repairs; use replicate 1 to break a tie. Arms
without such a candidate are recorded as `not-selected`, not substituted. Copy
the selected durable snapshot into a fresh outside-repository directory before
the Fresh Agent sees it. Preserve both baseline and exit snapshots.

The candidate removes its arm's main data-access treatment and retains G1
behaviour using native `pg`. It may retain business SQL and application logic;
it must not reintroduce a generator, snapshot, compatibility wrapper, or a
second abstraction merely to simulate the removed treatment. Candidate repairs
have the standard cap (initial plus two). Runner pass requires a frozen
baseline-manifest match before work, an explicit treatment-removal scan, final
G1 pass, final DB/cleanup evidence, and a complete source/artifact diff.
