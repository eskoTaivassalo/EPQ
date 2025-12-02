param(
  [string]$ServiceAccountJson = "./serviceAccount.json",
  [string]$ProjectId = "",  # Set your Firebase project ID here
  [int]$Count = 15
)

# Ensure we're in the project root where package.json exists
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

function Ensure-Node {
  try {
    $nodeVersion = node -v 2>$null
  } catch {
    Write-Error "Node.js is required. Please install Node.js and retry."
    exit 1
  }
}

function Ensure-FirebaseAdmin {
  $npmList = & npm ls firebase-admin --depth=0 2>&1
  if ($LASTEXITCODE -ne 0 -or -not ($npmList -match 'firebase-admin')) {
    Write-Host "Installing firebase-admin..."
    & npm install firebase-admin --save-dev | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed to install firebase-admin."
      exit 1
    }
  }
}

function Resolve-PathSafe([string]$p) {
  if ($p.StartsWith("~")) {
    return (Join-Path $HOME $p.Substring(2))
  }
  return (Resolve-Path -Path $p).Path
}

Ensure-Node
Ensure-FirebaseAdmin

# Validate service account path
try {
  $svcPath = Resolve-PathSafe -p $ServiceAccountJson
} catch {
  Write-Error "Service account JSON not found at: $ServiceAccountJson"
  exit 1
}

$nodeArgs = @(
  "scripts/seed-teachers.js",
  "--serviceAccount", $svcPath,
  "--projectId", $ProjectId,
  "--count", $Count
)

Write-Host "Running seeder for project '$ProjectId' with $Count teachers..." -ForegroundColor Cyan
& node $nodeArgs
$exit = $LASTEXITCODE
if ($exit -ne 0) {
  Write-Error "Seeding failed with exit code $exit"
  exit $exit
}

Write-Host "Seeding completed successfully." -ForegroundColor Green
