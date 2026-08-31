# AF-V architecture clause

Start from the supplied ordinary vertical-slice skeleton. Add the G1
data-access feature without moving the supplied pool, transaction seam, DTO,
or test seam into a tool-owned global architecture. Keep ticket-specific SQL,
data access and use-case code feature-local when the selected treatment allows
it. Do not add an Ashiba-specific, ORM-specific, or benchmark-specific
application framework. Report the treatment's normal required structure in
your source; the runner will observe the resulting delta.
