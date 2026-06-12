param(
  [switch]$KeepWorktree
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Script
  )

  Write-Host "==> $Label"
  $global:LASTEXITCODE = 0
  & $Script
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

function Assert-Contains {
  param(
    [string]$Value,
    [string]$Expected,
    [string]$Label
  )

  if (!$Value.Contains($Expected)) {
    throw "$Label did not contain expected text: $Expected"
  }
}

function Assert-UnderPath {
  param(
    [string]$Child,
    [string]$Parent
  )

  $resolvedParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\', '/')
  $resolvedChild = [System.IO.Path]::GetFullPath($Child).TrimEnd('\', '/')
  if (!$resolvedChild.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside expected parent path. child=$resolvedChild parent=$resolvedParent"
  }
}

function Remove-Tree {
  param(
    [string]$Path,
    [string]$AllowedParent
  )

  Assert-UnderPath -Child $Path -Parent $AllowedParent
  if (!(Test-Path -LiteralPath $Path)) {
    return
  }

  $resolved = [System.IO.Path]::GetFullPath($Path)
  if ($resolved.StartsWith('\\')) {
    $literalPath = '\\?\UNC\' + $resolved.TrimStart('\')
  } else {
    $literalPath = '\\?\' + $resolved
  }
  Remove-Item -LiteralPath $literalPath -Recurse -Force
}

$exerciseDir = (Resolve-Path $PSScriptRoot).Path
$exampleRoot = (Resolve-Path (Join-Path $exerciseDir '..\..')).Path
$repoRoot = (Resolve-Path (Join-Path $exampleRoot '..\..')).Path
$tmpRoot = Join-Path ([System.IO.Path]::GetTempPath()) 'ashiba-exercises'
$worktree = Join-Path $tmpRoot 'ddl-migration-script-from-git'
$worktreeExample = Join-Path $worktree 'examples\hono-pg-support-inbox'
$patchPath = Join-Path $exerciseDir 'solution.patch'
$migrationPath = Join-Path $worktreeExample 'tmp\ddl\customer-timezone-migration.sql'

if (!(Test-Path -LiteralPath $patchPath)) {
  throw "solution.patch was not found: $patchPath"
}

New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
Assert-UnderPath -Child $worktree -Parent $tmpRoot

if (Test-Path -LiteralPath $worktree) {
  Invoke-Step 'Remove previous verification worktree' {
    try {
      git -C $repoRoot worktree remove --force -- $worktree 2>$null
    } catch {
      Write-Host "git worktree remove did not fully clean the previous worktree; falling back to Remove-Item."
    }
    if (Test-Path -LiteralPath $worktree) {
      Remove-Tree -Path $worktree -AllowedParent $tmpRoot
    }
    git -C $repoRoot worktree prune
  }
}

try {
  Invoke-Step 'Create disposable worktree' {
    git -C $repoRoot -c core.autocrlf=false -c core.eol=lf worktree add --detach $worktree HEAD
    git -C $worktree config core.autocrlf false
    git -C $worktree config core.eol lf
    git -C $worktree -c core.autocrlf=false -c core.eol=lf checkout -- .
  }

  Invoke-Step 'Apply solution patch' {
    git -C $worktree apply --whitespace=nowarn $patchPath
  }

  Invoke-Step 'Install workspace dependencies' {
    pnpm --dir $worktree install
  }

  Invoke-Step 'Build Ashiba CLI' {
    pnpm -C $worktree --filter '@ashiba-ts/cli' build
  }

  Invoke-Step 'Generate reviewable migration SQL from Git-managed DDL' {
    $output = node (Join-Path $worktree 'packages\cli\dist\index.js') ddl migration generate `
      --from-git HEAD:examples/hono-pg-support-inbox/db/ddl `
      --to-dir (Join-Path $worktreeExample 'db\ddl') `
      --out $migrationPath

    if ($LASTEXITCODE -ne 0) {
      throw "ddl migration generate failed with exit code $LASTEXITCODE"
    }

    $script:generateOutput = $output -join "`n"
  }

  Invoke-Step 'Assert generated migration SQL and risk summary' {
    if (!(Test-Path -LiteralPath $migrationPath)) {
      throw "Expected migration file was not created: $migrationPath"
    }

    $migrationSql = Get-Content $migrationPath -Raw
    Assert-Contains -Value $migrationSql -Expected 'ALTER TABLE "public"."customers" ADD COLUMN "timezone" text NOT NULL DEFAULT ''Asia/Tokyo'';' -Label 'migration SQL'
    Assert-Contains -Value $script:generateOutput -Expected 'public.customers: add column timezone text not null' -Label 'command output'
    Assert-Contains -Value $script:generateOutput -Expected 'semantic_constraint_change: public.customers' -Label 'command output'
  }
} finally {
  if ($KeepWorktree) {
    Write-Host "Keeping verification worktree: $worktree"
  } elseif (Test-Path -LiteralPath $worktree) {
    Invoke-Step 'Clean verification worktree' {
      try {
        git -C $repoRoot worktree remove --force -- $worktree 2>$null
      } catch {
        Write-Host "git worktree remove did not fully clean the verification worktree; falling back to Remove-Item."
      }
      if (Test-Path -LiteralPath $worktree) {
        Remove-Tree -Path $worktree -AllowedParent $tmpRoot
      }
      git -C $repoRoot worktree prune
    }
  }
}
