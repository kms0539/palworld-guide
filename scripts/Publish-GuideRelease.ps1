[CmdletBinding()]
param(
    [string]$Root = '',
    [Parameter(Mandatory)][ValidatePattern('^v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$')][string]$Tag,
    [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$Changes,
    [switch]$PlanOnly,
    [switch]$SkipRefresh
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Root)) { $Root = Split-Path -Parent $PSScriptRoot }
$repoRoot = [IO.Path]::GetFullPath($Root)

function Resolve-Executable {
    param([string]$Name, [string[]]$Candidates)
    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return [IO.Path]::GetFullPath($candidate)
        }
    }
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return [string]$command.Source }
    throw "Required executable was not found: $Name"
}

$git = Resolve-Executable 'git.exe' @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd\git.exe'),
    (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe')
)
$node = Resolve-Executable 'node.exe' @(
    (Join-Path (Split-Path -Parent $repoRoot) 'runtime\node.exe'),
    (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe')
)
$pnpm = Resolve-Executable 'pnpm.cmd' @(
    (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd')
)
$env:Path = (Split-Path -Parent $node) + ';' + $env:Path

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$Arguments, [switch]$AllowFailure)
    $previousErrorPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& $git -C $repoRoot @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "git $($Arguments -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    [pscustomobject]@{ ExitCode = $exitCode; Output = $output }
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) { throw "Not a Git repository: $repoRoot" }
$origin = ((Invoke-Git @('remote', 'get-url', 'origin')).Output -join '').Trim()
if ($origin -notmatch '^https://github\.com/kms0539/palworld-guide(?:\.git)?$') { throw "Unexpected origin: $origin" }

$manifest = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tagVersion = $Tag.Substring(1)
if ([string]$manifest.version -cne $tagVersion) {
    throw "package.json version '$($manifest.version)' must match release tag '$tagVersion'."
}

Push-Location $repoRoot
try {
    if (-not $SkipRefresh) {
        & $pnpm run refresh
        if ($LASTEXITCODE -ne 0) { throw 'Guide data refresh failed.' }
        & $pnpm run 'assets:sync'
        if ($LASTEXITCODE -ne 0) { throw 'Guide visual asset sync failed.' }
    }
    & $pnpm test
    if ($LASTEXITCODE -ne 0) { throw 'Guide public-boundary tests failed.' }
} finally {
    Pop-Location
}

$eligible = @((Invoke-Git @('ls-files', '--cached', '--others', '--exclude-standard')).Output | Where-Object { $_ })
$forbidden = @($eligible | Where-Object {
    $_ -match '(?i)(^|/)(private|secrets|credentials|logs|backups)(/|$)|(^|/)\.env|\.pem$|\.key$|settings\.ini$'
})
if ($forbidden.Count) { throw "Private paths are eligible for commit: $($forbidden -join ', ')" }

$existingTag = Invoke-Git @('rev-list', '-n', '1', "refs/tags/$Tag") -AllowFailure
if ($PlanOnly) {
    [pscustomobject][ordered]@{
        planOnly = $true
        tag = $Tag
        testsPassed = $true
        deployment = 'GitHub Pages via OIDC'
        uacRequired = $false
    }
    return
}

[void](Invoke-Git @('add', '--all'))
[void](Invoke-Git @('diff', '--cached', '--check'))
$staged = @((Invoke-Git @('diff', '--cached', '--name-only')).Output | Where-Object { $_ })
if ($staged.Count) { [void](Invoke-Git @('commit', '-m', "Guide $Tag - $Changes")) }
$head = ((Invoke-Git @('rev-parse', 'HEAD')).Output -join '').Trim()
if ($existingTag.ExitCode -eq 0 -and $existingTag.Output.Count) {
    if ((($existingTag.Output -join '').Trim()) -ne $head) { throw "Local tag $Tag points to another commit." }
} else {
    [void](Invoke-Git @('tag', '-a', $Tag, '-m', "Palworld guide $Tag"))
}
[void](Invoke-Git @('push', 'origin', 'main'))
[void](Invoke-Git @('push', 'origin', "refs/tags/$Tag"))

[pscustomobject][ordered]@{
    released = $true
    tag = $Tag
    commit = $head
    repository = 'palworld-guide'
    deployment = 'GitHub Pages via OIDC'
    uacRequired = $false
}
