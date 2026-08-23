# O2 early rejection

O2 supplies requirements but no committed derived artifact. A clean build has
no deterministic input for G3/G4 and must invoke an external AI service. The
fixture therefore rejects O2 before build: `verify.mjs o2` fails closed.
