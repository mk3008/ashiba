# Dataset generator

Calibration will select one of 200k, 500k, or 1M rows before scoring. The
selected size, skew, indexes, and PostgreSQL version are recorded in the
decision log. Generated data is disposable; the generator and aggregate evidence
are durable.
