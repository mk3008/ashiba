# Consumer Migration

## Current references

The minimal Ticket Queue reference plus VSA and layered references retain visible SQL, direct named compilation/cache, native `pg`, application-owned finite sort literals, and application-owned transactions. Their generated binding modules and CLI generation/check scripts are removed.

## Detached Transfer

Transfer is not a current Ashiba product reference. Its CLI workspace dependency and CLI project-check script are removed so that it does not retain the deleted package. Its own architecture remains outside this implementation's product-boundary decision.

## Distribution consumers

The packed-consumer and npm-distribution proofs install only `@ashiba-ts/named-parameters`, then directly compile canonical SQL and bind hostile, missing, and unused values. Node 22/npm 10 and Node 24/npm 11 remain the supported distribution lanes.
