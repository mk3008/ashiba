# E1 assignment: bounded treatment removal

This directory begins as a copy of a successful candidate for your own arm.
Keep the frozen G1 public API and behaviour, but remove the arm's main
data-access treatment. Use native `pg` for the final execution path. Retain
visible business SQL and ordinary application tests where useful.

Do not alter runner-owned DDL, fixtures, or the public G1 contract. Do not
introduce an ORM/query builder/code generator/compatibility wrapper to replace
the removed treatment. Record the dependency, generated/configuration state,
and commands you remove or replace. The runner will scan for the frozen
treatment markers, run G1 independently, and retain the source diff.
