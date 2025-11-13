# Test-FirebaseConnection.ps1
# Tests Firebase connectivity and basic operations

param(
    [string]$ConfigPath = "./src/config/firebaseConfig.js",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$script:TestResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Errors = @()
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = ""
    )
    
    $script:TestResults.Total++
    
    if ($Passed) {
        $script:TestResults.Passed++
        Write-Host "✓ PASS: $TestName" -ForegroundColor Green
    } else {
        $script:TestResults.Failed++
        Write-Host "✗ FAIL: $TestName" -ForegroundColor Red
        if ($Message) {
            Write-Host "  └─ $Message" -ForegroundColor Yellow
        }
        $script:TestResults.Errors += @{
            Test = $TestName
            Message = $Message
        }
    }
}

function Test-FirebaseConfigExists {
    Write-Host "`n[TEST] Firebase Config File Exists" -ForegroundColor Cyan
    
    $exists = Test-Path $ConfigPath
    Write-TestResult -TestName "Firebase config file exists" -Passed $exists -Message $(if (-not $exists) { "File not found at: $ConfigPath" })
    
    return $exists
}

function Test-FirebaseConfigStructure {
    Write-Host "`n[TEST] Firebase Config Structure" -ForegroundColor Cyan
    
    try {
        $content = Get-Content $ConfigPath -Raw
        
        # Check for required Firebase config keys
        $requiredKeys = @(
            'apiKey',
            'authDomain',
            'projectId',
            'storageBucket',
            'messagingSenderId',
            'appId'
        )
        
        $allKeysPresent = $true
        foreach ($key in $requiredKeys) {
            $pattern = "$key\s*:"
            $hasKey = $content -match $pattern
            
            if (-not $hasKey) {
                $allKeysPresent = $false
                Write-TestResult -TestName "Config contains '$key'" -Passed $false -Message "Key '$key' not found"
            } else {
                Write-TestResult -TestName "Config contains '$key'" -Passed $true
            }
        }
        
        return $allKeysPresent
        
    } catch {
        Write-TestResult -TestName "Firebase config is readable" -Passed $false -Message $_.Exception.Message
        return $false
    }
}

function Test-FirebaseSecurityRules {
    Write-Host "`n[TEST] Firebase Security Rules" -ForegroundColor Cyan
    
    $firestoreRulesPath = "./firestore.rules"
    $storageRulesPath = "./storage.rules"
    
    $firestoreExists = Test-Path $firestoreRulesPath
    Write-TestResult -TestName "Firestore rules file exists" -Passed $firestoreExists
    
    $storageExists = Test-Path $storageRulesPath
    Write-TestResult -TestName "Storage rules file exists" -Passed $storageExists
    
    if ($firestoreExists) {
        $content = Get-Content $firestoreRulesPath -Raw
        
        # Check for common security patterns
        $hasAuth = $content -match "request\.auth"
        Write-TestResult -TestName "Firestore rules use authentication" -Passed $hasAuth -Message $(if (-not $hasAuth) { "No auth checks found in rules" })
        
        $hasAllowRead = $content -match "allow read"
        $hasAllowWrite = $content -match "allow write"
        Write-TestResult -TestName "Firestore rules define read/write permissions" -Passed ($hasAllowRead -or $hasAllowWrite)
    }
    
    return ($firestoreExists -and $storageExists)
}

function Test-FirebaseIndexes {
    Write-Host "`n[TEST] Firebase Indexes Configuration" -ForegroundColor Cyan
    
    $indexPath = "./firestore.indexes.json"
    
    $exists = Test-Path $indexPath
    Write-TestResult -TestName "Firestore indexes file exists" -Passed $exists
    
    if ($exists) {
        try {
            $content = Get-Content $indexPath -Raw | ConvertFrom-Json
            $hasIndexes = $content.indexes -and $content.indexes.Count -gt 0
            
            Write-TestResult -TestName "Indexes are configured" -Passed $hasIndexes -Message $(if (-not $hasIndexes) { "No indexes defined" })
            
            if ($Verbose -and $hasIndexes) {
                Write-Host "  Configured indexes: $($content.indexes.Count)" -ForegroundColor Gray
            }
            
        } catch {
            Write-TestResult -TestName "Indexes file is valid JSON" -Passed $false -Message $_.Exception.Message
        }
    }
    
    return $exists
}

function Show-TestSummary {
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    Write-Host "TEST SUMMARY" -ForegroundColor Cyan
    Write-Host ("=" * 50) -ForegroundColor Cyan
    
    Write-Host "Total Tests: $($script:TestResults.Total)" -ForegroundColor White
    Write-Host "Passed:      $($script:TestResults.Passed)" -ForegroundColor Green
    Write-Host "Failed:      $($script:TestResults.Failed)" -ForegroundColor Red
    
    $passRate = if ($script:TestResults.Total -gt 0) {
        [math]::Round(($script:TestResults.Passed / $script:TestResults.Total) * 100, 2)
    } else { 0 }
    
    Write-Host "Pass Rate:   $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 50) { "Yellow" } else { "Red" })
    
    if ($script:TestResults.Failed -gt 0) {
        Write-Host "`nFailed Tests:" -ForegroundColor Red
        foreach ($error in $script:TestResults.Errors) {
            Write-Host "  • $($error.Test)" -ForegroundColor Red
            if ($error.Message) {
                Write-Host "    $($error.Message)" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    
    # Exit with appropriate code for CI/CD
    if ($script:TestResults.Failed -gt 0) {
        exit 1
    } else {
        exit 0
    }
}

# Main execution
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Firebase Connection & Configuration Tests    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

try {
    Test-FirebaseConfigExists
    Test-FirebaseConfigStructure
    Test-FirebaseSecurityRules
    Test-FirebaseIndexes
    
    Show-TestSummary
    
} catch {
    Write-Host "`n✗ CRITICAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
