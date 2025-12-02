# Reanimated fix script - Puhdistaa kaikki cachet ja rebuilddaa

Write-Host "🧹 Cleaning Metro cache..." -ForegroundColor Yellow
npx expo start -c
Start-Sleep -Seconds 2

Write-Host "🧹 Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "🧹 Removing node_modules..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Yellow
npm install

Write-Host "🧹 Cleaning watchman (if available)..." -ForegroundColor Yellow
watchman watch-del-all 2>$null

Write-Host "✅ Ready for rebuild!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: eas build --profile development --platform android" -ForegroundColor White
Write-Host "2. Download and install the new .apk" -ForegroundColor White
Write-Host "3. Start: npx expo start" -ForegroundColor White
