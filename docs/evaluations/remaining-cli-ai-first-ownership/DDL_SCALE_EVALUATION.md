# Large DDL evaluation

The reproducible 600-table experiment is in `evaluation/ddl-scale/`.
Known-target inspection of one dump examined 2,171,319 bytes / 39,630 lines
(median); a table-unit layout examined 3,315 bytes / 66 lines. Unscoped
recursive search stayed about 1.45 MB in both layouts. `rg` plus a sensible
layout is practical, although the layout adds 599 files and is not free.
