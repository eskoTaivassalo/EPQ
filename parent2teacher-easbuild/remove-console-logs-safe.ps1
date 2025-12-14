# Safe Console Log Remover with Preview and Backup
# This script removes console.log/warn/error/debug/info statements safely

param(
    [switch]$DryRun = $true,  # Default to preview mode
    [switch]$Backup = $true,  # Create backups by default
    [int]$MaxFiles = 5        # Limit files in test mode
)

$srcPath = Join-Path $PSScriptRoot "src"
$backupPath = Join-Path $PSScriptRoot "backup_console_logs_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "`n🔍 Console Log Remover - Safe Mode" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "📋 DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    Write-Host "   Run with -DryRun:`$false to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  LIVE MODE - Files will be modified!" -ForegroundColor Red
    if ($Backup) {
        Write-Host "💾 Backups will be created in: $backupPath" -ForegroundColor Green
    }
}

Write-Host "`n"

# Get all JS/JSX files, excluding node_modules and .expo
$jsFiles = Get-ChildItem -Path $srcPath -Recurse -Include *.js,*.jsx | 
    Where-Object { $_.FullName -notmatch 'node_modules|\.expo|backup_' }

if ($DryRun -and $MaxFiles -gt 0) {
    $jsFiles = $jsFiles | Select-Object -First $MaxFiles
    Write-Host "🧪 Testing with first $MaxFiles files only`n" -ForegroundColor Yellow
}

$totalFiles = 0
$totalRemovals = 0
$changedFiles = @()

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $removals = @()
    
    # Pattern 1: Single-line console statements (most common and safest)
    # Matches: "  console.log('test');" or "console.error(x);"
    $pattern1 = '(?m)^(\s*)console\.(log|warn|error|debug|info)\s*\([^\n]*?\)\s*;?\s*$'
    
    $matches = [regex]::Matches($content, $pattern1)
    foreach ($match in $matches) {
        $removals += @{
            Line = $match.Value.Trim()
            Length = $match.Length
        }
    }
    
    # Only process if we found console statements
    if ($removals.Count -gt 0) {
        $totalFiles++
        $changedFiles += $file.FullName
        
        Write-Host "📄 $($file.Name)" -ForegroundColor Cyan
        Write-Host "   Path: $($file.FullName.Replace($srcPath, 'src'))" -ForegroundColor Gray
        Write-Host "   Found $($removals.Count) console statement(s):" -ForegroundColor Yellow
        
        # Show preview of what will be removed
        $removals | ForEach-Object {
            $preview = $_.Line
            if ($preview.Length -gt 80) {
                $preview = $preview.Substring(0, 77) + "..."
            }
            Write-Host "   ❌ $preview" -ForegroundColor Red
        }
        
        $totalRemovals += $removals.Count
        
        if (-not $DryRun) {
            # Create backup if enabled
            if ($Backup) {
                $relativePath = $file.FullName.Replace($srcPath, "")
                $backupFile = Join-Path $backupPath $relativePath
                $backupDir = Split-Path $backupFile -Parent
                
                if (-not (Test-Path $backupDir)) {
                    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
                }
                
                Copy-Item $file.FullName $backupFile -Force
            }
            
            # Apply the removal
            $newContent = [regex]::Replace($content, $pattern1, '')
            
            # Clean up excessive blank lines (max 2 consecutive)
            $newContent = [regex]::Replace($newContent, '(?m)^\s*$(\r?\n^\s*$){2,}', "`n`n")
            
            # Write the modified content
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            
            Write-Host "   ✅ Removed $($removals.Count) console statements" -ForegroundColor Green
        }
        
        Write-Host ""
    }
}

# Summary
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Files scanned:        $($jsFiles.Count)" -ForegroundColor White
Write-Host "Files with consoles:  $totalFiles" -ForegroundColor Yellow
Write-Host "Total removals:       $totalRemovals" -ForegroundColor Red

if ($DryRun) {
    Write-Host "`n✨ This was a preview. No files were modified." -ForegroundColor Green
    Write-Host "`nTo apply these changes, run:" -ForegroundColor Yellow
    Write-Host "  .\remove-console-logs-safe.ps1 -DryRun:`$false -MaxFiles 0" -ForegroundColor White
    Write-Host "`nOr test with limited files first:" -ForegroundColor Yellow
    Write-Host "  .\remove-console-logs-safe.ps1 -DryRun:`$false -MaxFiles 10" -ForegroundColor White
} else {
    Write-Host "`n✅ Changes applied successfully!" -ForegroundColor Green
    if ($Backup) {
        Write-Host "💾 Backups saved to: $backupPath" -ForegroundColor Cyan
        Write-Host "`nIf something went wrong, you can restore from backups." -ForegroundColor Yellow
    }
}

Write-Host ""

# Return changed files for verification
if ($changedFiles.Count -gt 0) {
    Write-Host "Changed files:" -ForegroundColor Cyan
    $changedFiles | ForEach-Object {
        Write-Host "  - $($_.Replace($srcPath, 'src'))" -ForegroundColor Gray
    }
}
