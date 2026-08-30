# Arm D delta

Use the installed stable Drizzle query/SQL and transaction APIs for the main
data-access path. Do not replace it with a direct `pg` implementation. Record
any Drizzle schema/config/generated migration state required by your path.
