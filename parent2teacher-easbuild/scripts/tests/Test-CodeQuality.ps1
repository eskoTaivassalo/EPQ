# Test-CodeQuality.ps1
# Tests code quality, linting, and common issues

param(
    [string]$SourcePath = "./src",
    [switch]$Verbose,
    [switch]$FixIssues
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
        [string]$Severity = "Error" # Error, Warning, Info
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

function Test-NoConsoleStatements {
    Write-Host "`n[TEST] Console Statements in Production Code" -ForegroundColor Cyan
    
    $jsFiles = Get-ChildItem -Path $SourcePath -Filter "*.js" -Recurse -File
    $foundIssues = @()
    
    foreach ($file in $jsFiles) {
        # Skip test files and dev screens
        if ($file.Name -match "test|spec|\.dev\." -or $file.Directory.Name -eq "dev") {
            continue
        }
        
        $content = Get-Content $file.FullName
        $lineNumber = 0
        
        foreach ($line in $content) {
            $lineNumber++
            
            # Check for console.log, console.warn, console.error (not in comments)
            if ($line -match "^\s*console\.(log|warn|error|info|debug)" -and $line -notmatch "^\s*//") {
                $foundIssues += @{
                    File = $file.FullName.Replace($PWD.Path + "\", "")
                    Line = $lineNumber
                    Content = $line.Trim()
                }
            }
        }
    }
    
    if ($foundIssues.Count -gt 0) {
        $message = "Found $($foundIssues.Count) console statement(s) in production code"
        Write-TestResult -TestName "No console statements in production" -Passed $false -Message $message -Severity "Warning"
        
        if ($Verbose) {
            foreach ($issue in $foundIssues) {
                Write-Host "    $($issue.File):$($issue.Line)" -ForegroundColor Gray
                Write-Host "      $($issue.Content)" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-TestResult -TestName "No console statements in production" -Passed $true
    }
    
    return ($foundIssues.Count -eq 0)
}

function Test-NoHardcodedSecrets {
    Write-Host "`n[TEST] Hardcoded Secrets and API Keys" -ForegroundColor Cyan
    
    $jsFiles = Get-ChildItem -Path $SourcePath -Filter "*.js" -Recurse -File
    $foundSecrets = @()
    
    # Patterns that might indicate hardcoded secrets
    $secretPatterns = @(
        'apiKey\s*[=:]\s*[''"](?!.*\$\{)[A-Za-z0-9-_]{20,}[''"]',  # API keys
        'password\s*[=:]\s*[''"][^''"\$\{]+[''"]',                 # Passwords
        'secret\s*[=:]\s*[''"][^''"\$\{]+[''"]',                   # Secrets
        'token\s*[=:]\s*[''"](?!.*\$\{)[A-Za-z0-9-_]{20,}[''"]'    # Tokens
    )
    
    foreach ($file in $jsFiles) {
        # Skip config files which are expected to have these
        if ($file.Name -match "Config\.js$|\.config\.js$") {
            continue
        }
        
        $content = Get-Content $file.FullName -Raw
        
        foreach ($pattern in $secretPatterns) {
            if ($content -match $pattern) {
                $foundSecrets += @{
                    File = $file.FullName.Replace($PWD.Path + "\", "")
                    Pattern = $pattern
                }
            }
        }
    }
    
    if ($foundSecrets.Count -gt 0) {
        $message = "Found $($foundSecrets.Count) potential hardcoded secret(s)"
        Write-TestResult -TestName "No hardcoded secrets" -Passed $false -Message $message
        
        if ($Verbose) {
            foreach ($secret in $foundSecrets) {
                Write-Host "    $($secret.File)" -ForegroundColor Gray
            }
        }
    } else {
        Write-TestResult -TestName "No hardcoded secrets" -Passed $true
    }
    
    return ($foundSecrets.Count -eq 0)
}

function Test-ImportStructure {
    Write-Host "`n[TEST] Import Statement Structure" -ForegroundColor Cyan
    
    $jsFiles = Get-ChildItem -Path $SourcePath -Filter "*.js" -Recurse -File
    $issues = @()
    
    foreach ($file in $jsFiles) {
        $content = Get-Content $file.FullName
        $lineNumber = 0
        
        foreach ($line in $content) {
            $lineNumber++
            
            # Check for common import issues
            if ($line -match "import.*from\s+['\"]\.\.\/\.\.\/\.\.\/") {
                $issues += @{
                    File = $file.FullName.Replace($PWD.Path + "\", "")
                    Line = $lineNumber
                    Type = "Deep relative imports (3+ levels)"
                }
            }
            
            # Check for unused imports (basic check - looking for * imports)
            if ($line -match "import\s+\*\s+as") {
                $issues += @{
                    File = $file.FullName.Replace($PWD.Path + "\", "")
                    Line = $lineNumber
                    Type = "Wildcard import"
                }
            }
        }
    }
    
    if ($issues.Count -gt 0) {
        $message = "Found $($issues.Count) import structure issue(s)"
        Write-TestResult -TestName "Clean import structure" -Passed $false -Message $message -Severity "Warning"
        
        if ($Verbose) {
            foreach ($issue in $issues) {
                Write-Host "    $($issue.File):$($issue.Line) - $($issue.Type)" -ForegroundColor Gray
            }
        }
    } else {
        Write-TestResult -TestName "Clean import structure" -Passed $true
    }
    
    return ($issues.Count -eq 0)
}

function Test-FileNamingConvention {
    Write-Host "`n[TEST] File Naming Conventions" -ForegroundColor Cyan
    
    $issues = @()
    
    # Check screens should end with Screen.js
    $screenFiles = Get-ChildItem -Path "$SourcePath\screens" -Filter "*.js" -Recurse -File -ErrorAction SilentlyContinue
    foreach ($file in $screenFiles) {
        if ($file.Name -notmatch "Screen\.js$") {
            $issues += @{
                File = $file.FullName.Replace($PWD.Path + "\", "")
                Type = "Screen file should end with 'Screen.js'"
            }
        }
    }
    
    # Check components should use PascalCase
    $componentFiles = Get-ChildItem -Path "$SourcePath\components" -Filter "*.js" -Recurse -File -ErrorAction SilentlyContinue
    foreach ($file in $componentFiles) {
        if ($file.BaseName -cmatch "^[a-z]") {
            $issues += @{
                File = $file.FullName.Replace($PWD.Path + "\", "")
                Type = "Component should use PascalCase"
            }
        }
    }
    
    # Check services should end with Service.js
    $serviceFiles = Get-ChildItem -Path "$SourcePath\services" -Filter "*.js" -Recurse -File -ErrorAction SilentlyContinue
    foreach ($file in $serviceFiles) {
        if ($file.Name -notmatch "Service\.js$") {
            $issues += @{
                File = $file.FullName.Replace($PWD.Path + "\", "")
                Type = "Service file should end with 'Service.js'"
            }
        }
    }
    
    if ($issues.Count -gt 0) {
        $message = "Found $($issues.Count) naming convention issue(s)"
        Write-TestResult -TestName "File naming conventions" -Passed $false -Message $message -Severity "Warning"
        
        if ($Verbose) {
            foreach ($issue in $issues) {
                Write-Host "    $($issue.File)" -ForegroundColor Gray
                Write-Host "      $($issue.Type)" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-TestResult -TestName "File naming conventions" -Passed $true
    }
    
    return ($issues.Count -eq 0)
}

function Test-TODOComments {
    Write-Host "`n[TEST] TODO/FIXME Comments" -ForegroundColor Cyan
    
    $jsFiles = Get-ChildItem -Path $SourcePath -Filter "*.js" -Recurse -File
    $todos = @()
    
    foreach ($file in $jsFiles) {
        $content = Get-Content $file.FullName
        $lineNumber = 0
        
        foreach ($line in $content) {
            $lineNumber++
            
            if ($line -match "//.*\b(TODO|FIXME|XXX|HACK)\b") {
                $todos += @{
                    File = $file.FullName.Replace($PWD.Path + "\", "")
                    Line = $lineNumber
                    Content = $line.Trim()
                }
            }
        }
    }
    
    if ($todos.Count -gt 0) {
        $message = "Found $($todos.Count) TODO/FIXME comment(s)"
        Write-TestResult -TestName "No pending TODOs" -Passed $false -Message $message -Severity "Warning"
        
        if ($Verbose) {
            foreach ($todo in $todos) {
                Write-Host "    $($todo.File):$($todo.Line)" -ForegroundColor Gray
                Write-Host "      $($todo.Content)" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-TestResult -TestName "No pending TODOs" -Passed $true
    }
}

function Show-TestSummary {
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    Write-Host "CODE QUALITY TEST SUMMARY" -ForegroundColor Cyan
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
                Write-Host "  • $($issue.Test): $($issue.Message)" -ForegroundColor Red
            }
        }
        
        if ($warnings.Count -gt 0) {
            Write-Host "`nWarnings:" -ForegroundColor Yellow
            foreach ($issue in $warnings) {
                Write-Host "  • $($issue.Test): $($issue.Message)" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    
    # Exit with error code only for actual errors, not warnings
    if ($script:TestResults.Failed -gt 0) {
        exit 1
    } else {
        exit 0
    }
}

# Main execution
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Code Quality & Lint Tests             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

try {
    Test-NoConsoleStatements
    Test-NoHardcodedSecrets
    Test-ImportStructure
    Test-FileNamingConvention
    Test-TODOComments
    
    Show-TestSummary
    
} catch {
    Write-Host "`n✗ CRITICAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
