# Test-Dependencies.ps1
# Tests npm dependencies, versions, and security vulnerabilities

param(
    [switch]$Verbose,
    [switch]$CheckOutdated,
    [switch]$SecurityAudit
)

$ErrorActionPreference = "Stop"
$script:TestResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Warnings = 0
    Issues = @()
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = "",
        [string]$Severity = "Error"
    )
    
    $script:TestResults.Total++
    
    if ($Passed) {
        $script:TestResults.Passed++
        Write-Host "✓ PASS: $TestName" -ForegroundColor Green
    } else {
        if ($Severity -eq "Warning") {
            $script:TestResults.Warnings++
            Write-Host "⚠ WARN: $TestName" -ForegroundColor Yellow
        } else {
            $script:TestResults.Failed++
            Write-Host "✗ FAIL: $TestName" -ForegroundColor Red
        }
        
        if ($Message) {
            Write-Host "  └─ $Message" -ForegroundColor Yellow
        }
        
        $script:TestResults.Issues += @{
            Test = $TestName
            Message = $Message
            Severity = $Severity
        }
    }
}

function Test-PackageJsonExists {
    Write-Host "`n[TEST] Package.json Existence" -ForegroundColor Cyan
    
    $exists = Test-Path "./package.json"
    Write-TestResult -TestName "package.json exists" -Passed $exists
    
    if ($exists) {
        try {
            $packageJson = Get-Content "./package.json" -Raw | ConvertFrom-Json
            Write-TestResult -TestName "package.json is valid JSON" -Passed $true
            
            # Check for required fields
            $hasName = $null -ne $packageJson.name
            Write-TestResult -TestName "package.json has 'name' field" -Passed $hasName
            
            $hasVersion = $null -ne $packageJson.version
            Write-TestResult -TestName "package.json has 'version' field" -Passed $hasVersion
            
            $hasDependencies = $null -ne $packageJson.dependencies
            Write-TestResult -TestName "package.json has 'dependencies' field" -Passed $hasDependencies
            
            return $true
        } catch {
            Write-TestResult -TestName "package.json is valid JSON" -Passed $false -Message $_.Exception.Message
            return $false
        }
    }
    
    return $false
}

function Test-NodeModulesInstalled {
    Write-Host "`n[TEST] Node Modules Installation" -ForegroundColor Cyan
    
    $exists = Test-Path "./node_modules"
    Write-TestResult -TestName "node_modules directory exists" -Passed $exists -Message $(if (-not $exists) { "Run 'npm install' to install dependencies" })
    
    if ($exists) {
        try {
            $packageJson = Get-Content "./package.json" -Raw | ConvertFrom-Json
            $missingModules = @()
            
            # Check if critical dependencies are installed
            $criticalDeps = @('react', 'react-native', 'expo')
            
            foreach ($dep in $criticalDeps) {
                if ($packageJson.dependencies.PSObject.Properties.Name -contains $dep) {
                    $depPath = "./node_modules/$dep"
                    if (-not (Test-Path $depPath)) {
                        $missingModules += $dep
                    }
                }
            }
            
            if ($missingModules.Count -gt 0) {
                Write-TestResult -TestName "Critical dependencies installed" -Passed $false -Message "Missing: $($missingModules -join ', ')"
            } else {
                Write-TestResult -TestName "Critical dependencies installed" -Passed $true
            }
            
        } catch {
            Write-TestResult -TestName "Can read package.json" -Passed $false -Message $_.Exception.Message
        }
    }
    
    return $exists
}

function Test-PackageLockExists {
    Write-Host "`n[TEST] Package Lock File" -ForegroundColor Cyan
    
    $npmLock = Test-Path "./package-lock.json"
    $yarnLock = Test-Path "./yarn.lock"
    
    if ($npmLock -and $yarnLock) {
        Write-TestResult -TestName "Only one lock file exists" -Passed $false -Message "Both package-lock.json and yarn.lock found" -Severity "Warning"
    } elseif ($npmLock -or $yarnLock) {
        Write-TestResult -TestName "Lock file exists" -Passed $true
        
        if ($Verbose) {
            $lockType = if ($npmLock) { "npm (package-lock.json)" } else { "yarn (yarn.lock)" }
            Write-Host "  Using $lockType" -ForegroundColor Gray
        }
    } else {
        Write-TestResult -TestName "Lock file exists" -Passed $false -Message "No lock file found (package-lock.json or yarn.lock)" -Severity "Warning"
    }
}

function Test-DependencyVersions {
    Write-Host "`n[TEST] Dependency Version Consistency" -ForegroundColor Cyan
    
    try {
        $packageJson = Get-Content "./package.json" -Raw | ConvertFrom-Json
        $issues = @()
        
        # Check for wildcards or loose version constraints
        $allDeps = @{}
        
        if ($packageJson.dependencies) {
            foreach ($prop in $packageJson.dependencies.PSObject.Properties) {
                $allDeps[$prop.Name] = @{
                    Version = $prop.Value
                    Type = "dependency"
                }
            }
        }
        
        if ($packageJson.devDependencies) {
            foreach ($prop in $packageJson.devDependencies.PSObject.Properties) {
                $allDeps[$prop.Name] = @{
                    Version = $prop.Value
                    Type = "devDependency"
                }
            }
        }
        
        foreach ($dep in $allDeps.Keys) {
            $version = $allDeps[$dep].Version
            
            # Check for wildcards
            if ($version -match "[\*x]") {
                $issues += "Wildcard version for $dep ($version)"
            }
            
            # Check for loose constraints (^, ~)
            if ($version -match "^[\^~]") {
                # This is actually OK for most cases, but flag for awareness
                if ($Verbose) {
                    Write-Host "  ℹ $dep uses loose version constraint: $version" -ForegroundColor DarkGray
                }
            }
        }
        
        if ($issues.Count -gt 0) {
            Write-TestResult -TestName "No wildcard versions" -Passed $false -Message "$($issues.Count) wildcard version(s) found" -Severity "Warning"
            
            if ($Verbose) {
                foreach ($issue in $issues) {
                    Write-Host "    $issue" -ForegroundColor Gray
                }
            }
        } else {
            Write-TestResult -TestName "No wildcard versions" -Passed $true
        }
        
    } catch {
        Write-TestResult -TestName "Can parse dependencies" -Passed $false -Message $_.Exception.Message
    }
}

function Test-SecurityAudit {
    if (-not $SecurityAudit) {
        return
    }
    
    Write-Host "`n[TEST] NPM Security Audit" -ForegroundColor Cyan
    
    try {
        # Run npm audit and capture output
        $auditOutput = npm audit --json 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
            Write-TestResult -TestName "No security vulnerabilities" -Passed $true
        } else {
            try {
                $auditData = $auditOutput | ConvertFrom-Json
                
                $critical = if ($auditData.metadata.vulnerabilities.critical) { $auditData.metadata.vulnerabilities.critical } else { 0 }
                $high = if ($auditData.metadata.vulnerabilities.high) { $auditData.metadata.vulnerabilities.high } else { 0 }
                $moderate = if ($auditData.metadata.vulnerabilities.moderate) { $auditData.metadata.vulnerabilities.moderate } else { 0 }
                $low = if ($auditData.metadata.vulnerabilities.low) { $auditData.metadata.vulnerabilities.low } else { 0 }
                
                $message = "Found vulnerabilities: Critical=$critical, High=$high, Moderate=$moderate, Low=$low"
                $severity = if ($critical -gt 0 -or $high -gt 0) { "Error" } else { "Warning" }
                
                Write-TestResult -TestName "No security vulnerabilities" -Passed $false -Message $message -Severity $severity
                
                if ($Verbose -and $auditData.vulnerabilities) {
                    Write-Host "  Run 'npm audit fix' to fix automatically fixable issues" -ForegroundColor Yellow
                }
                
            } catch {
                Write-TestResult -TestName "Can run security audit" -Passed $false -Message "Failed to parse audit output"
            }
        }
        
    } catch {
        Write-TestResult -TestName "Can run security audit" -Passed $false -Message $_.Exception.Message -Severity "Warning"
    }
}

function Test-OutdatedPackages {
    if (-not $CheckOutdated) {
        return
    }
    
    Write-Host "`n[TEST] Outdated Packages" -ForegroundColor Cyan
    
    try {
        $outdatedOutput = npm outdated --json 2>&1 | Out-String
        
        if ($outdatedOutput) {
            try {
                $outdatedData = $outdatedOutput | ConvertFrom-Json
                $count = ($outdatedData.PSObject.Properties | Measure-Object).Count
                
                if ($count -gt 0) {
                    Write-TestResult -TestName "All packages up to date" -Passed $false -Message "$count package(s) outdated" -Severity "Warning"
                    
                    if ($Verbose) {
                        Write-Host "  Outdated packages:" -ForegroundColor Yellow
                        foreach ($pkg in $outdatedData.PSObject.Properties) {
                            $name = $pkg.Name
                            $current = $pkg.Value.current
                            $latest = $pkg.Value.latest
                            Write-Host "    $name: $current → $latest" -ForegroundColor Gray
                        }
                    }
                } else {
                    Write-TestResult -TestName "All packages up to date" -Passed $true
                }
                
            } catch {
                # No outdated packages (empty output)
                Write-TestResult -TestName "All packages up to date" -Passed $true
            }
        } else {
            Write-TestResult -TestName "All packages up to date" -Passed $true
        }
        
    } catch {
        Write-TestResult -TestName "Can check outdated packages" -Passed $false -Message $_.Exception.Message -Severity "Warning"
    }
}

function Show-TestSummary {
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    Write-Host "DEPENDENCY TEST SUMMARY" -ForegroundColor Cyan
    Write-Host ("=" * 50) -ForegroundColor Cyan
    
    Write-Host "Total Tests: $($script:TestResults.Total)" -ForegroundColor White
    Write-Host "Passed:      $($script:TestResults.Passed)" -ForegroundColor Green
    Write-Host "Failed:      $($script:TestResults.Failed)" -ForegroundColor Red
    Write-Host "Warnings:    $($script:TestResults.Warnings)" -ForegroundColor Yellow
    
    $passRate = if ($script:TestResults.Total -gt 0) {
        [math]::Round(($script:TestResults.Passed / $script:TestResults.Total) * 100, 2)
    } else { 0 }
    
    Write-Host "Pass Rate:   $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 50) { "Yellow" } else { "Red" })
    
    if ($script:TestResults.Issues.Count -gt 0) {
        $errors = $script:TestResults.Issues | Where-Object { $_.Severity -eq "Error" }
        $warnings = $script:TestResults.Issues | Where-Object { $_.Severity -eq "Warning" }
        
        if ($errors.Count -gt 0) {
            Write-Host "`nErrors:" -ForegroundColor Red
            foreach ($issue in $errors) {
                Write-Host "  • $($issue.Test)" -ForegroundColor Red
                if ($issue.Message) {
                    Write-Host "    $($issue.Message)" -ForegroundColor Yellow
                }
            }
        }
        
        if ($warnings.Count -gt 0) {
            Write-Host "`nWarnings:" -ForegroundColor Yellow
            foreach ($issue in $warnings) {
                Write-Host "  • $($issue.Test)" -ForegroundColor Yellow
                if ($issue.Message) {
                    Write-Host "    $($issue.Message)" -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    
    # Exit with error code only for critical errors
    if ($script:TestResults.Failed -gt 0) {
        exit 1
    } else {
        exit 0
    }
}

# Main execution
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Dependency Health Tests              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

try {
    Test-PackageJsonExists
    Test-NodeModulesInstalled
    Test-PackageLockExists
    Test-DependencyVersions
    Test-SecurityAudit
    Test-OutdatedPackages
    
    Show-TestSummary
    
} catch {
    Write-Host "`n✗ CRITICAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
