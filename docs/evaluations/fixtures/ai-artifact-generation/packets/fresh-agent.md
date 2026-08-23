# C treatment packet: generate an execution artifact

You are an independent fresh replicate in an evaluation. Your task is to write
only `artifact.json` in the candidate directory named by the dispatcher.

Inputs you may read:

- `../artifact-schema.json`
- `../application-requirements.md`
- every SQL file in `../workloads/`
- `../verifier.mjs` and `../runner/submit.mjs` for contract feedback

Do **not** inspect or call Ashiba's existing generator, source under
`packages/cli`, prior generated artifacts, B results, another candidate, or
past expected coordinates. Do not use an existing artifact as a template.
You may write a temporary general-purpose script outside the repository to
derive the artifact, but do not leave that script in your candidate directory
or this fixture.

Your artifact must include `w1-named-lexical`, `w2-optional-search`,
`w3-sort`, and `w4-mixed-complex`. Run the dispatcher wrapper after every
submission; it records verifier calls independently of your self-report:

```powershell
node ../runner/submit.mjs candidate-name
```

The verifier checks only local/mechanical properties. Passing it is not a claim
of SQL semantics. Submit the best final artifact even if you cannot make it
pass. Do not change the frozen schema, workload SQL, verifier, or runner.
