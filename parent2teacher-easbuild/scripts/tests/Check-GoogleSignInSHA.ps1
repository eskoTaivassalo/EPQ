# 🔐 Google Sign-In SHA Sertifikaattien Tarkistus
# Tämä skripti auttaa sinua saamaan tarvittavat SHA-sertifikaatit Firebase Consolen konfigurointiin

Write-Host "🔍 Google Sign-In SHA Sertifikaattien Tarkistus" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\eskot\Desktop\koodaus aineistoa\projektit\opiskelukansio\Näyttö\Uusi kansio\ParentsTeachersApp"

# Tarkista onko android-kansio olemassa
if (Test-Path "$projectRoot\android") {
    Write-Host "✅ Android-kansio löytyi" -ForegroundColor Green
    Write-Host ""
    
    # Vaihtoehto 1: Gradle Signing Report
    Write-Host "📋 Vaihtoehto 1: Käytä Gradle Signing Report -komentoa" -ForegroundColor Yellow
    Write-Host "Aja seuraava komento Android-kansiossa:" -ForegroundColor White
    Write-Host "  cd android" -ForegroundColor Cyan
    Write-Host "  ./gradlew signingReport" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "⚠️  Android-kansio ei löytynyt" -ForegroundColor Yellow
    Write-Host "Tämä on normaalia Expo-projektissa ilman prebuild:ia" -ForegroundColor Gray
    Write-Host ""
}

# Vaihtoehto 2: Keytool (toimii aina)
Write-Host "📋 Vaihtoehto 2: Käytä keytool-komentoa (SUOSITELTU Expo-projekteille)" -ForegroundColor Yellow
Write-Host ""

# Tarkista onko keytool saatavilla
$keytoolPath = (Get-Command keytool -ErrorAction SilentlyContinue).Source

if ($keytoolPath) {
    Write-Host "✅ keytool löytyi: $keytoolPath" -ForegroundColor Green
    Write-Host ""
    
    # Debug keystore (kehitysympäristö)
    Write-Host "🔑 Debug Keystore SHA-sertifikaatit (Kehitysympäristö):" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    $debugKeystore = "$env:USERPROFILE\.android\debug.keystore"
    
    if (Test-Path $debugKeystore) {
        Write-Host "✅ Debug keystore löytyi: $debugKeystore" -ForegroundColor Green
        Write-Host ""
        Write-Host "Haetaan SHA-sertifikaatit..." -ForegroundColor Yellow
        Write-Host ""
        
        try {
            # Hae SHA-1 ja SHA-256
            $output = keytool -list -v -keystore $debugKeystore -alias androiddebugkey -storepass android -keypass android 2>&1
            
            # Etsi SHA-1 ja SHA-256
            $sha1 = ($output | Select-String "SHA1: (.+)").Matches.Groups[1].Value
            $sha256 = ($output | Select-String "SHA256: (.+)").Matches.Groups[1].Value
            
            if ($sha1) {
                Write-Host "SHA-1:" -ForegroundColor Green
                Write-Host "  $sha1" -ForegroundColor White
                Write-Host ""
            }
            
            if ($sha256) {
                Write-Host "SHA-256:" -ForegroundColor Green
                Write-Host "  $sha256" -ForegroundColor White
                Write-Host ""
            }
            
            if (-not $sha1 -and -not $sha256) {
                Write-Host "⚠️  SHA-sertifikaatteja ei löytynyt outputista" -ForegroundColor Yellow
                Write-Host "Täysi output:" -ForegroundColor Gray
                Write-Host $output -ForegroundColor Gray
            }
            
        } catch {
            Write-Host "❌ Virhe haettaessa sertifikaatteja: $_" -ForegroundColor Red
        }
        
    } else {
        Write-Host "⚠️  Debug keystore ei löytynyt: $debugKeystore" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Luo debug keystore ajamalla:" -ForegroundColor White
        Write-Host "  keytool -genkey -v -keystore $debugKeystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android" -ForegroundColor Cyan
    }
    
} else {
    Write-Host "❌ keytool ei löytynyt PATH-muuttujasta" -ForegroundColor Red
    Write-Host "Asenna Java JDK saadaksesi keytool-työkalun" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📱 Seuraavat vaiheet:" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Kopioi yllä näkyvät SHA-1 ja SHA-256 sertifikaatit" -ForegroundColor White
Write-Host ""
Write-Host "2. Mene Firebase Consoleen:" -ForegroundColor White
Write-Host "   https://console.firebase.google.com/" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Valitse ParentsTeachersApp projekti" -ForegroundColor White
Write-Host ""
Write-Host "4. Mene: Project Settings (⚙️) → Your apps → Android app" -ForegroundColor White
Write-Host ""
Write-Host "5. Lisää SHA-sertifikaatit:" -ForegroundColor White
Write-Host "   - Klikkaa 'Add fingerprint'" -ForegroundColor Gray
Write-Host "   - Liitä SHA-1 sertifikaatti" -ForegroundColor Gray
Write-Host "   - Klikkaa 'Add fingerprint' uudelleen" -ForegroundColor Gray
Write-Host "   - Liitä SHA-256 sertifikaatti" -ForegroundColor Gray
Write-Host "   - Klikkaa 'Save'" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Lataa uusi google-services.json:" -ForegroundColor White
Write-Host "   - Firebase Console → Android app → Download google-services.json" -ForegroundColor Gray
Write-Host "   - Korvaa projektin juuressa oleva tiedosto" -ForegroundColor Gray
Write-Host ""
Write-Host "7. Käynnistä sovellus uudelleen ja testaa Google-kirjautumista" -ForegroundColor White
Write-Host ""

Write-Host "✅ Valmis!" -ForegroundColor Green
Write-Host ""

# Tarjoa mahdollisuus avata Firebase Console
$openFirebase = Read-Host "Haluatko avata Firebase Consolen nyt? (k/e)"
if ($openFirebase -eq 'k') {
    Start-Process "https://console.firebase.google.com/"
}
