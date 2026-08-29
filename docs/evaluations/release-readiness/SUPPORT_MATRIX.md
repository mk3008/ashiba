# Release support matrix

As of 2026-08-30, Ashiba supports Node.js 22.x LTS and 24.x LTS. Node 24 is
the recommended line. This follows the [official Node.js release
schedule](https://nodejs.org/en/about/previous-releases): Node 20 is EOL and
Node 26 is Current, so neither is part of the formal release claim.

| Runtime | Package engine | npm distribution proof | Status |
| --- | --- | --- | --- |
| Node 22 LTS | `^22.0.0` | bundled npm 10 | CI compatibility lane |
| Node 24 LTS | `^24.0.0` | bundled npm 11 | primary verification and CI lane |

No `engines.npm` claim is made. Ashiba is usable from package managers other
than npm; npm 10/11 are the release-distribution evidence only.
