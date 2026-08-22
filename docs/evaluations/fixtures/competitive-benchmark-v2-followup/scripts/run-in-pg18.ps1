param(
  [Parameter(Mandatory = $true)]
  [string]$Command
)

$ErrorActionPreference = 'Stop'
$role = "ashiba_bench_run_$([guid]::NewGuid().ToString('N').Substring(0, 16))"
$database = "ashiba_bench_db_$([guid]::NewGuid().ToString('N').Substring(0, 16))"
$password = ([guid]::NewGuid().ToString('N') + 'Aa1')
$create = 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE ' + $role + ' LOGIN PASSWORD ''' + $password + ''';" -c "CREATE DATABASE ' + $database + ' OWNER ' + $role + ';"'
docker exec docker_postgres18 sh -lc $create | Out-Null
try {
  $url = "postgresql://${role}:$([uri]::EscapeDataString($password))@127.0.0.1:5432/$database"
  $env:DATABASE_URL = $url
  $env:ASHIBA_TEST_DATABASE_URL = $url
  $env:ASHIBA_POSTGRES_DATABASE_URL = $url
  $env:SQLC_PG_URL = $url
  $env:ASHIBA_BENCHMARK_NODE_VERSION = (& npx --yes --package node@24.19.0 node --version)
  & pwsh -NoProfile -Command $Command
  exit $LASTEXITCODE
}
finally {
  $drop = 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ' + $database + ' WITH (FORCE);" -c "DROP ROLE IF EXISTS ' + $role + ';"'
  docker exec docker_postgres18 sh -lc $drop | Out-Null
}
