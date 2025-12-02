# 🧪 Google Sign-In Pikatesti
# Tarkistaa nopeasti että kaikki on kunnossa ennen sovelluksen käynnistystä

Write-Host ""
Write-Host "🧪 Google Sign-In Konfiguraation Tarkistus" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\eskot\Desktop\koodaus aineistoa\projektit\opiskelukansio\Näyttö\Uusi kansio\ParentsTeachersApp"
$allOk = $true

# 1. Tarkista google-services.json
Write-Host "1. Tarkistetaan google-services.json..." -ForegroundColor Yellow
if (Test-Path "$projectRoot\google-services.json") {
    Write-Host "   ✅ google-services.json löytyi" -ForegroundColor Green
    
    # Tarkista että tiedostossa on client_id
    $content = Get-Content "$projectRoot\google-services.json" -Raw
    if ($content -match '"client_id"') {
        Write-Host "   ✅ Client ID löytyy tiedostosta" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Client ID puuttuu tiedostosta" -ForegroundColor Red
        $allOk = $false
    }
} else {
    Write-Host "   ❌ google-services.json puuttuu" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 2. Tarkista app.json
Write-Host "2. Tarkistetaan app.json..." -ForegroundColor Yellow
if (Test-Path "$projectRoot\app.json") {
    $appJson = Get-Content "$projectRoot\app.json" -Raw | ConvertFrom-Json
    
    # Tarkista Android package
    # Package name check removed - depends on current Firebase project configuration
    Write-Host "   📦 Android package: $($appJson.expo.android.package)" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠️  Android package: $($appJson.expo.android.package)" -ForegroundColor Yellow
    }
    
    # Tarkista Google Sign-In plugin
    if ($appJson.expo.plugins -contains "@react-native-google-signin/google-signin") {
        Write-Host "   ✅ Google Sign-In plugin löytyy" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Google Sign-In plugin puuttuu" -ForegroundColor Red
        $allOk = $false
    }
    
    # Tarkista googleServicesFile
    if ($appJson.expo.android.googleServicesFile) {
        Write-Host "   ✅ googleServicesFile määritetty: $($appJson.expo.android.googleServicesFile)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  googleServicesFile ei määritetty (ei välttämätön Expo:lle)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ app.json puuttuu" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 3. Tarkista authService.js
Write-Host "3. Tarkistetaan authService.js..." -ForegroundColor Yellow
if (Test-Path "$projectRoot\src\services\authService.js") {
    $authService = Get-Content "$projectRoot\src\services\authService.js" -Raw
    
    # Tarkista Web Client ID
    if ($authService -match 'webClientId:\s*['""]\d+-[a-z0-9]+\.apps\.googleusercontent\.com['""]') {
        Write-Host "   ✅ Web Client ID löytyy ja on oikein" -ForegroundColor Green
    } elseif ($authService -match 'webClientId:\s*[''"]YOUR_WEB_CLIENT_ID_HERE[''"]') {
        Write-Host "   ❌ Web Client ID ei ole asetettu (YOUR_WEB_CLIENT_ID_HERE)" -ForegroundColor Red
        $allOk = $false
    } else {
        Write-Host "   ⚠️  Web Client ID on asetettu (tarkista että se on oikein)" -ForegroundColor Yellow
    }
    
    # Tarkista että signInWithGoogle funktio löytyy
    if ($authService -match 'signInWithGoogle') {
        Write-Host "   ✅ signInWithGoogle-funktio löytyy" -ForegroundColor Green
    } else {
        Write-Host "   ❌ signInWithGoogle-funktio puuttuu" -ForegroundColor Red
        $allOk = $false
    }
} else {
    Write-Host "   ❌ authService.js puuttuu" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 4. Tarkista package.json
Write-Host "4. Tarkistetaan package.json..." -ForegroundColor Yellow
if (Test-Path "$projectRoot\package.json") {
    $packageJson = Get-Content "$projectRoot\package.json" -Raw | ConvertFrom-Json
    
    # Tarkista Google Sign-In paketti
    if ($packageJson.dependencies."@react-native-google-signin/google-signin") {
        $version = $packageJson.dependencies."@react-native-google-signin/google-signin"
        Write-Host "   ✅ @react-native-google-signin/google-signin: $version" -ForegroundColor Green
    } else {
        Write-Host "   ❌ @react-native-google-signin/google-signin puuttuu" -ForegroundColor Red
        $allOk = $false
    }
    
    # Tarkista Firebase
    if ($packageJson.dependencies.firebase) {
        $version = $packageJson.dependencies.firebase
        Write-Host "   ✅ firebase: $version" -ForegroundColor Green
    } else {
        Write-Host "   ❌ firebase puuttuu" -ForegroundColor Red
        $allOk = $false
    }
} else {
    Write-Host "   ❌ package.json puuttuu" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 5. Tarkista SHA-sertifikaatit
Write-Host "5. Tarkistetaan SHA-sertifikaatit..." -ForegroundColor Yellow
$debugKeystore = "$env:USERPROFILE\.android\debug.keystore"
if (Test-Path $debugKeystore) {
    Write-Host "   ✅ Debug keystore löytyy" -ForegroundColor Green
    
    try {
        $keytool = (Get-Command keytool -ErrorAction SilentlyContinue).Source
        if ($keytool) {
            $sha = keytool -list -v -keystore $debugKeystore -alias androiddebugkey -storepass android -keypass android 2>&1 | Select-String "SHA1:"
            if ($sha) {
                Write-Host "   ✅ SHA-1: $($sha -replace '.*SHA1:\s*', '')" -ForegroundColor Green
            }
        } else {
            Write-Host "   ⚠️  keytool ei löytynyt (ei voida tarkistaa SHA:ta)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  SHA:n lukeminen epäonnistui" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Debug keystore ei löytynyt: $debugKeystore" -ForegroundColor Yellow
    Write-Host "      (Normaalia ennen ensimmäistä Android-buildia)" -ForegroundColor Gray
}
Write-Host ""

# Yhteenveto
Write-Host "===========================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "✅ Kaikki näyttää olevan kunnossa!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Seuraavaksi:" -ForegroundColor Cyan
    Write-Host "   1. Varmista että SHA-sertifikaatit on lisätty Firebase Consoleen" -ForegroundColor White
    Write-Host "   2. Varmista että Google Sign-In on aktivoitu Firebase Consolessa" -ForegroundColor White
    Write-Host "   3. Käynnistä sovellus: npm start" -ForegroundColor White
    Write-Host "   4. Testaa Google-kirjautumista" -ForegroundColor White
} else {
    Write-Host "⚠️  Joitakin ongelmia löytyi (katso yllä)" -ForegroundColor Yellow
    Write-Host "   Korjaa ongelmat ennen testausta" -ForegroundColor White
}
Write-Host ""
