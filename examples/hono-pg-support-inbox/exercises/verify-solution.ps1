param(
  [Parameter(Mandatory = $true)]
  [string]$ExerciseDir,
  [switch]$StartDocker,
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

$resolvedExerciseDir = (Resolve-Path $ExerciseDir).Path
$exerciseName = Split-Path $resolvedExerciseDir -Leaf
$exampleRoot = (Resolve-Path (Join-Path $resolvedExerciseDir '..\..')).Path
$repoRoot = (Resolve-Path (Join-Path $exampleRoot '..\..')).Path
$tmpRoot = Join-Path ([System.IO.Path]::GetTempPath()) 'ashiba-exercises'
$worktree = Join-Path $tmpRoot $exerciseName
$patchPath = Join-Path $resolvedExerciseDir 'solution.patch'
$worktreeExample = Join-Path $worktree 'examples\hono-pg-support-inbox'

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
  Invoke-Step 'Create LF-only disposable worktree' {
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

  Invoke-Step 'Build local packages used by file: dependencies' {
    pnpm -C $worktree --filter '@ashiba-ts/named-parameters' build
  }

  Invoke-Step 'Refresh example file: dependency copies' {
    pnpm --dir $worktreeExample install
  }

  if ($StartDocker) {
    Invoke-Step 'Start PostgreSQL test database' {
      if (!$env:ASHIBA_TEST_DB_PORT) {
        $env:ASHIBA_TEST_DB_PORT = '55433'
      }
      docker compose -f (Join-Path $worktreeExample 'compose.yaml') --project-directory $worktreeExample up -d
    }
  }

  Invoke-Step 'Typecheck support inbox demo' {
    pnpm --dir $worktreeExample typecheck
  }

  Invoke-Step 'Run support inbox tests' {
    if (!$env:ASHIBA_TEST_DB_PORT) {
      $env:ASHIBA_TEST_DB_PORT = '55433'
    }
    Remove-Item Env:ASHIBA_TEST_DATABASE_URL -ErrorAction SilentlyContinue
    pnpm --dir $worktreeExample test
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
