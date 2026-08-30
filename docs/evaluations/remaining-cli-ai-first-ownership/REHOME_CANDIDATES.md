# Rehome candidates

Query uses, DDL lint, and live PostgreSQL contract operate on generic SQL,
DDL, or PostgreSQL inputs. Rehome requires an independent consumer, separable
dependencies, and no named compiler/binder regression. SQL-resource is not
ready to rehome: it has no current consumer and owns generated fleet state.
