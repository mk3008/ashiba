$candidateRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $candidateRoot '.tools\sqlc.exe') generate
exit $LASTEXITCODE
