# Script to remove all console.log, console.warn, console.error, console.debug, console.info statements
# from JavaScript files in the src directory

$srcPath = Join-Path $PSScriptRoot "src"

Write-Host "🧹 Removing console logs from $srcPath..." -ForegroundColor Cyan

$jsFiles = Get-ChildItem -Path $srcPath -Recurse -Include *.js,*.jsx

$totalFiles = 0
$totalLinesRemoved = 0

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove standalone console.* lines (single line)
    $content = $content -replace '(?m)^\s*console\.(log|warn|error|debug|info)\([^)]*\);?\s*[\r\n]+', ''
    
    # Remove multiline console.* calls (handles nested parentheses)
    $content = $content -replace '(?s)^\s*console\.(log|warn|error|debug|info)\([^;]*?\);?\s*[\r\n]+', ''
    
    # Remove inline console.* calls (on same line as other code)
    $content = $content -replace '\s*console\.(log|warn|error|debug|info)\([^)]*\);?\s*', ' '
    
    # Clean up multiple consecutive empty lines
    $content = $content -replace '(?m)^\s*[\r\n]{3,}', "`n`n"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n✨ Done! Cleaned $totalFiles files" -ForegroundColor Green
