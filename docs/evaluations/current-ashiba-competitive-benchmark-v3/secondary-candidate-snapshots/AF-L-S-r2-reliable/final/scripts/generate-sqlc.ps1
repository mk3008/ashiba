$ErrorActionPreference = 'Stop'
$candidateRoot = (Resolve-Path "$PSScriptRoot\\..").Path
$schemaDirectory = Join-Path $candidateRoot 'node_modules\\.sqlc'
New-Item -ItemType Directory -Force -Path $schemaDirectory | Out-Null
$schema = @'
CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'closed');
CREATE TABLE tickets (
  id bigint PRIMARY KEY,
  title text NOT NULL,
  status ticket_status NOT NULL,
  assignee text,
  priority integer NOT NULL,
  created_at timestamptz NOT NULL,
  metadata jsonb NOT NULL
);
CREATE TABLE ticket_audit (
  audit_id bigint PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES tickets(id),
  action text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL
);
'@
[System.IO.File]::WriteAllText((Join-Path $schemaDirectory 'schema.sql'), $schema, [System.Text.UTF8Encoding]::new($false))
docker run --rm -v "${candidateRoot}:/src" -w /src sqlc/sqlc:1.31.1 generate
