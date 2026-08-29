# Generated Metadata Cost

## Current shape

The generated coordinate contract includes source ranges, removal ranges,
replacement text, grouped branch-prefix ranges, PostgreSQL-lowered ranges,
source identity, and parser capability state. Runtime must keep all of those
consistent through optional removal and placeholder renumbering.

Current Support Inbox plus Transfer metadata files containing the field total
67,810 bytes across 11 files. One Support Inbox list query metadata file alone
is 32,351 bytes because it records multi-branch source and lowered coordinate
facts.

## Existing scale evidence

The dynamic ablation compares retained nullable guards (O-A) with coordinate
compression (O-C):

| Query count | O-A artifact bytes | O-C artifact bytes | O-C files |
| ---: | ---: | ---: | ---: |
| 1 | 740 | 18,473 | 20 |
| 10 | 5,807 | 181,715 | 182 |
| 100 | 56,477 | 1,814,135 | 1,802 |

At 100 queries, O-C is 32.1x O-A artifact bytes and six times the files. The
artifacts were stable on a second generation, but stability does not eliminate
review, source-edit, range-format, parser-support, version, refresh, and
compatibility maintenance.

## AI-assisted maintenance

AI can regenerate coordinate files, but that does not eliminate the
Maintenance Surface: the agent and reviewer must still understand when to
refresh, why a stale failure happened, whether a range is valid, and which
runtime rewriting semantics are supported. Conversely, AI can readily maintain
a nullable guard or visible application variant and use ordinary tests to
repair behavioral edits. The decision is based on this cost/value comparison,
not on an assumption that AI edits are safe.
