$ErrorActionPreference = 'Stop'
$candidateRoot = (Resolve-Path "$PSScriptRoot\\..").Path
docker run --rm -v "${candidateRoot}:/src" -w /src sqlc/sqlc:1.31.1 generate
