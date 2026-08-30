# Architecture neutrality

The VSA arm kept application code and visible SQL feature-local. The Layered arm placed the same concerns in an entry point and data-access module. Both used the same public Ashiba package and direct compile/bind/native-pg sequence, and both passed the same runner-owned PostgreSQL oracle.

Neither arm introduced an Ashiba architecture layer, repository abstraction, unit of work, or special runtime. The differences are ordinary application organization, not an Ashiba product requirement. The optional unconstrained third arm was not run: two independent architecture arms already satisfied the required release gate, and a third arm would add cost without a new mandatory acceptance signal.
