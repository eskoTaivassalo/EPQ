# Seed 10 diverse teachers for testing recommendations
# Usage: .\scripts\seed-diverse-teachers.ps1

Write-Host "🌍 Seeding 10 diverse teachers from around the world..." -ForegroundColor Cyan
Write-Host ""

$serviceAccount = ".\parents2teachers-1d8a3-firebase-adminsdk-fbsvc-b94300839b.json"
$projectId = "parents2teachers-1d8a3"

if (-not (Test-Path $serviceAccount)) {
    Write-Host "❌ Service account file not found: $serviceAccount" -ForegroundColor Red
    Write-Host "   Please make sure the Firebase Admin SDK key is in the project root." -ForegroundColor Yellow
    exit 1
}

Write-Host "📝 Teachers to be added:" -ForegroundColor Green
Write-Host "  1. Maria Garcia (Spain) - Spanish, English" -ForegroundColor White
Write-Host "  2. Yuki Tanaka (Finland/Japan) - Japanese, Mathematics" -ForegroundColor White
Write-Host "  3. Ahmed Hassan (Sweden) - Math, Physics, Chemistry" -ForegroundColor White
Write-Host "  4. Sophie Dubois (Finland/France) - French, Art, Music" -ForegroundColor White
Write-Host "  5. Liu Wei (China) - Chinese, Programming" -ForegroundColor White
Write-Host "  6. Emma Johnson (Finland/UK) - English, History, Philosophy" -ForegroundColor White
Write-Host "  7. Pietro Rossi (Italy) - Italian, Geography, History" -ForegroundColor White
Write-Host "  8. Olga Petrov (Finland/Russia) - Russian, Math, Chemistry" -ForegroundColor White
Write-Host "  9. Hans Mueller (Finland/Germany) - German, Economics" -ForegroundColor White
Write-Host " 10. Priya Sharma (Finland/India) - English, Biology, Psychology" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue with seeding? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "❌ Cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Running seed script..." -ForegroundColor Cyan

node .\scripts\seed-diverse-teachers.js --serviceAccount $serviceAccount --projectId $projectId

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Success! 10 diverse teachers added to Firestore" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Testing recommendations:" -ForegroundColor Cyan
    Write-Host "  1. Restart your app: npx expo start -c" -ForegroundColor White
    Write-Host "  2. Go to Parent Dashboard" -ForegroundColor White
    Write-Host "  3. Check 'Recommended for You' section" -ForegroundColor White
    Write-Host "  4. Edit your profile preferences (subjects, location, languages)" -ForegroundColor White
    Write-Host "  5. Pull to refresh - recommendations should update based on your preferences" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Seeding failed. Check the error messages above." -ForegroundColor Red
    exit 1
}
