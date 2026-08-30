# Lint evaluation

DDL-backed lint fails closed without a DDL model and catches missing tables,
columns, and obvious literal-type mismatches. It is optional deterministic
proof, not Builder Mapper core, and applies to generic static SQL repositories.
Decision: **REHOME-AS-GENERIC-TOOL**, after independent-consumer and package
boundary evidence; no generic advisory framework is proposed.
