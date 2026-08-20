# Fresh-agent condition prompts

The pilot runner creates one prompt by concatenating the immutable common
block below, exactly one workload file (`greenfield-task.md` or
`brownfield-task.md`), the immutable verification guidance, and one condition
suffix. Do not edit the workload or verification text between conditions.
This keeps A/B/C differences limited to tool instruction.

## Immutable common block

```text
You are implementing the assigned PostgreSQL application workload in the
provided clean working directory. Read the workload and verification files
before changing code. Preserve the starting database/application contract,
use a disposable database only, and keep a run log containing files read,
commands, validation, retries, and any uncertainty. Implement the smallest
complete feature, retain an independently reviewable canonical SQL source,
bind runtime values safely, show the transaction boundary, and test the raw
database-to-application type boundary. Do not claim done until the focused
PostgreSQL checks and the applicable existing tests have run. Report any
verification that was unavailable instead of inferring it.
```

## A — Rules + Verify

```text
The Ashiba rules/constitution excerpt is supplied as context. Do not run any
Ashiba scaffold, generator, init, create, or code-generation command. You may
use the final Ashiba verification/check command after implementing the
application, if it applies to the files you chose. Record whether it was
discoverable and what it reported. The application design remains yours.
```

## B — Tool Available

```text
The normal Ashiba environment and its commands are installed and available
for discovery, but no tool is required. Choose your implementation and
verification workflow as you naturally would from the rules and the workload;
do not tune the design for this experiment. Record which Ashiba commands you
noticed, used, skipped, or repeated, and whether a tool result changed a
decision. Do not treat tool availability as evidence that a command should be
run.
```

## C — Tool Required

```text
Use the currently documented Ashiba scaffold/generate/check workflow as part
of this implementation. Explicitly run the recommended scaffold or generator
step, adapt its output to the workload and the existing brownfield style when
applicable, and run the recommended check/verifier. Record exact commands,
generated artifacts, repairs/reverts, repeats, and tool-result confusion.
The workload's canonical SQL, safety, transaction, PostgreSQL, and
architecture requirements still take precedence over generated output.
```

## Condition observation record

For every run, the runner records the selected condition, tool commands
discovered/used/not used, number of executions and repeats, generated files
created and later removed, human intervention, final static/live result, and
any verifier finding that caused unnecessary investigation. The condition
suffix must not disclose the pilot hypothesis or suggest that fewer commands
or files are inherently better.
