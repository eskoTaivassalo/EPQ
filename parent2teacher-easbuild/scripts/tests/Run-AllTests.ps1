# Run-AllTests.ps1
# Master test runner that executes all test suites

param(
    [switch]$Verbose,
    [switch]$SecurityAudit,
    [switch]$CheckOutdated,
    [switch]$ContinueOnError,
    [string]$OutputFormat = "Console", # Console, JSON, JUnit
    [string]$OutputPath = "./test-results"
)

$ErrorActionPreference = if ($ContinueOnError) { "Continue" } else { "Stop" }

$script:AllResults = @{
    StartTime = Get-Date
    Suites = @()
    TotalTests = 0
    TotalPassed = 0
    TotalFailed = 0
    TotalWarnings = 0
}

function Invoke-TestSuite {
    param(
        [string]$Name,
        [string]$ScriptPath,
        [hashtable]$Parameters = @{}
    )
    
    Write-Host "`n`n" + ("═" * 60) -ForegroundColor Magenta
    Write-Host "  Running: $Name" -ForegroundColor Magenta
    Write-Host ("═" * 60) -ForegroundColor Magenta
    
    $startTime = Get-Date
    
    try {
        # Build parameter string
        $paramString = ""
        foreach ($key in $Parameters.Keys) {
            if ($Parameters[$key] -eq $true) {
                $paramString += " -$key"
            } else {
                $paramString += " -$key '$($Parameters[$key])'"
            }
        }
        
        # Execute the test script
        $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Parameters 2>&1
        $exitCode = $LASTEXITCODE
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        $result = @{
            Name = $Name
            ScriptPath = $ScriptPath
            ExitCode = $exitCode
            Duration = $duration
            Output = $output
            Success = ($exitCode -eq 0)
        }
        
        $script:AllResults.Suites += $result
        
        if ($exitCode -eq 0) {
            Write-Host "`n✓ $Name completed successfully (${duration}s)" -ForegroundColor Green
        } else {
            Write-Host "`n✗ $Name failed with exit code $exitCode (${duration}s)" -ForegroundColor Red
            
            if (-not $ContinueOnError) {
                throw "Test suite failed: $Name"
            }
        }
        
        return $result
        
    } catch {
        Write-Host "`n✗ ERROR running $Name : $($_.Exception.Message)" -ForegroundColor Red
        
        $result = @{
            Name = $Name
            ScriptPath = $ScriptPath
            ExitCode = 1
            Duration = 0
            Output = $_.Exception.Message
            Success = $false
        }
        
        $script:AllResults.Suites += $result
        
        if (-not $ContinueOnError) {
            throw
        }
        
        return $result
    }
}

function Show-FinalSummary {
    Write-Host "`n`n" + ("═" * 60) -ForegroundColor Cyan
    Write-Host "  FINAL TEST SUMMARY" -ForegroundColor Cyan
    Write-Host ("═" * 60) -ForegroundColor Cyan
    
    $script:AllResults.EndTime = Get-Date
    $totalDuration = ($script:AllResults.EndTime - $script:AllResults.StartTime).TotalSeconds
    
    $passed = ($script:AllResults.Suites | Where-Object { $_.Success }).Count
    $failed = ($script:AllResults.Suites | Where-Object { -not $_.Success }).Count
    $total = $script:AllResults.Suites.Count
    
    Write-Host "`nTest Suites:" -ForegroundColor White
    Write-Host "  Total:   $total" -ForegroundColor White
    Write-Host "  Passed:  $passed" -ForegroundColor Green
    Write-Host "  Failed:  $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
    
    Write-Host "`nDuration: $([math]::Round($totalDuration, 2))s" -ForegroundColor White
    
    Write-Host "`nSuite Results:" -ForegroundColor White
    foreach ($suite in $script:AllResults.Suites) {
        $icon = if ($suite.Success) { "✓" } else { "✗" }
        $color = if ($suite.Success) { "Green" } else { "Red" }
        $duration = [math]::Round($suite.Duration, 2)
        
        Write-Host "  $icon $($suite.Name) (${duration}s)" -ForegroundColor $color
    }
    
    Write-Host "`n" + ("═" * 60) -ForegroundColor Cyan
    
    # Save results if output format specified
    if ($OutputFormat -ne "Console") {
        Export-TestResults
    }
    
    # Exit with appropriate code
    if ($failed -gt 0) {
        Write-Host "`n⚠ Some test suites failed. Review the output above for details." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "`n✓ All test suites passed!" -ForegroundColor Green
        exit 0
    }
}

function Export-TestResults {
    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    switch ($OutputFormat) {
        "JSON" {
            $jsonPath = Join-Path $OutputPath "test-results_$timestamp.json"
            $script:AllResults | ConvertTo-Json -Depth 10 | Set-Content $jsonPath
            Write-Host "Results exported to: $jsonPath" -ForegroundColor Cyan
        }
        
        "JUnit" {
            $xmlPath = Join-Path $OutputPath "test-results_$timestamp.xml"
            
            # Create JUnit XML format
            $xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
"@
            
            foreach ($suite in $script:AllResults.Suites) {
                $xml += @"
  <testsuite name="$($suite.Name)" tests="1" failures="$(if ($suite.Success) { 0 } else { 1 })" time="$($suite.Duration)">
    <testcase name="$($suite.Name)" time="$($suite.Duration)">
"@
                
                if (-not $suite.Success) {
                    $xml += @"
      <failure message="Test suite failed">
        Exit Code: $($suite.ExitCode)
      </failure>
"@
                }
                
                $xml += @"
    </testcase>
  </testsuite>
"@
            }
            
            $xml += @"
</testsuites>
"@
            
            $xml | Set-Content $xmlPath
            Write-Host "JUnit results exported to: $xmlPath" -ForegroundColor Cyan
        }
    }
}

# Main execution
Write-Host @"

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           DevOps Test Suite Runner                        ║
║           ParentsTeachersApp                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define test suites
$testSuites = @(
    @{
        Name = "Firebase Connection Tests"
        Script = Join-Path $scriptDir "Test-FirebaseConnection.ps1"
        Params = @{ Verbose = $Verbose }
    },
    @{
        Name = "Code Quality Tests"
        Script = Join-Path $scriptDir "Test-CodeQuality.ps1"
        Params = @{ Verbose = $Verbose }
    },
    @{
        Name = "Dependency Health Tests"
        Script = Join-Path $scriptDir "Test-Dependencies.ps1"
        Params = @{
            Verbose = $Verbose
            SecurityAudit = $SecurityAudit
            CheckOutdated = $CheckOutdated
        }
    }
)

try {
    # Run all test suites
    foreach ($suite in $testSuites) {
        Invoke-TestSuite -Name $suite.Name -ScriptPath $suite.Script -Parameters $suite.Params
    }
    
    Show-FinalSummary
    
} catch {
    Write-Host "`n✗ CRITICAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
