param(
  [switch]$StartDocker,
  [switch]$KeepWorktree
)

& (Join-Path $PSScriptRoot '..\verify-solution.ps1') -ExerciseDir $PSScriptRoot -StartDocker:$StartDocker -KeepWorktree:$KeepWorktree
