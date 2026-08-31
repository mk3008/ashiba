$ErrorActionPreference = "Stop"

$candidateRoot = Split-Path -Parent $PSScriptRoot
$cellRoot = Split-Path -Parent $candidateRoot
$packetSchema = Join-Path $cellRoot "packet\schema.sql"
if (-not (Test-Path -LiteralPath $packetSchema -PathType Leaf)) {
  throw "The packet-owned schema was not found: $packetSchema"
}

$temporarySchema = Join-Path ([System.IO.Path]::GetTempPath()) ("g1-s-r1-sqlc-schema-" + [guid]::NewGuid().ToString("N") + ".sql")
try {
  # sqlc needs ordinary unqualified names for its offline parser. The runner
  # supplies the concrete schema at execution time through the role search_path.
  (Get-Content -LiteralPath $packetSchema -Raw).Replace("{{schema}}.", "").Replace("{{schema}}", "public") |
    Set-Content -LiteralPath $temporarySchema -NoNewline

  docker run --rm -v "${candidateRoot}:/src" -v "${temporarySchema}:/schema/schema.sql:ro" -w /src sqlc/sqlc:1.31.1 generate
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  if (Test-Path -LiteralPath $temporarySchema -PathType Leaf) {
    Remove-Item -LiteralPath $temporarySchema -Force
  }
}
