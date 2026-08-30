# AF-L-A-r2 reliable repair 1

This is the bounded first candidate repair after the separately preserved
initial attempt. The repair narrowed the application input values before
numeric validation and used the package's `ParameterBinding` union explicitly
instead of allowing TypeScript's overload inference to choose the anonymous
rendering branch.

## Verification from the external candidate root

| Check | Exit/status |
| --- | --- |
| Strict TypeScript `tsc --noEmit` | `0` |
| TypeScript build | `0` |
| AF runner | `P` |
| Primary G1 oracle through AF runner | `P` (20/20 checks) |
| Static isolation/source check | `pass`, zero findings |
| Runner cleanup | `pass` |

The exact empty success stdout/stderr streams for the candidate-root typecheck
and build, the AF runner result, the primary G1 result, and its pre-cleanup
record are copied verbatim in `external-evidence/`.

## Architecture observation

The runner recorded baseline integrity `pass`, source unchanged during runner
execution `true`, and delta complete `true`. It recorded changed baseline
files `src/application.ts`, `src/application/ticket-service.ts`, and
`src/data-access/ticket-data-access.ts`; the only new source-root files are
the supplied package manifest and lock. It recorded no new global/config
files and no generated directories. The no-`.sql` result is reported by the
runner as `featureLocalSql: not-applicable`; canonical SQL is visible in the
ordinary data-access layer.

## Preservation status

* source snapshot: complete, excluding `node_modules` and `dist`
* stdout/stderr: copied from the absolute external candidate/evidence root
* runner/oracle and pre-cleanup database-state records: copied
* cleanup: the runner-owned nonce schema/role cleanup passed
* candidate directory: retained externally pending parent-level cleanup
