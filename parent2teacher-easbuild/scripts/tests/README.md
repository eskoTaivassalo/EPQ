# DevOps PowerShell Test Suite

Kattava testauskokoelma ParentsTeachersApp-projektin DevOps-testaukseen.

## 📋 Yleiskatsaus

Testiskriptit on suunniteltu:
- ✅ Automaattiseen testaukseen CI/CD-putkissa
- ✅ Paikalliseen kehitystestaukseen
- ✅ Pre-commit/pre-push hookeihin
- ✅ Nopean palautteen antamiseen kehittäjille

## 🧪 Testiskriptit

### 1. Test-FirebaseConnection.ps1
Testaa Firebase-konfiguraation ja -yhteyden:
- Firebase config -tiedoston olemassaolo
- Konfiguraatiorakenne (apiKey, authDomain, jne.)
- Security rules -tiedostot
- Firestore-indeksit

```powershell
# Perus ajo
.\scripts\tests\Test-FirebaseConnection.ps1

# Verbose-tilassa
.\scripts\tests\Test-FirebaseConnection.ps1 -Verbose
```

### 2. Test-CodeQuality.ps1
Testaa koodin laatua:
- Console.log -lauseet tuotantokoodissa
- Kovakoodatut salaisuudet/API-avaimet
- Import-rakenne
- Nimeämiskäytännöt
- TODO/FIXME-kommentit

```powershell
# Perus ajo
.\scripts\tests\Test-CodeQuality.ps1

# Verbose-tilassa (näyttää kaikki löydetyt ongelmat)
.\scripts\tests\Test-CodeQuality.ps1 -Verbose

# Korjaa löydetyt ongelmat automaattisesti (tulossa)
.\scripts\tests\Test-CodeQuality.ps1 -FixIssues
```

### 3. Test-Dependencies.ps1
Testaa npm-riippuvuuksia:
- package.json olemassaolo ja rakenne
- node_modules asennus
- Lock-tiedostot
- Versioiden johdonmukaisuus
- Turvallisuusauditointi (valinnainen)
- Vanhentuneet paketit (valinnainen)

```powershell
# Perus ajo
.\scripts\tests\Test-Dependencies.ps1

# Turvallisuusauditoinnilla
.\scripts\tests\Test-Dependencies.ps1 -SecurityAudit

# Tarkista vanhentuneet paketit
.\scripts\tests\Test-Dependencies.ps1 -CheckOutdated

# Kaikki testit
.\scripts\tests\Test-Dependencies.ps1 -Verbose -SecurityAudit -CheckOutdated
```

### 4. Run-AllTests.ps1
Master-skripti, joka ajaa kaikki testit:

```powershell
# Aja kaikki testit
.\scripts\tests\Run-AllTests.ps1

# Verbose-tilassa
.\scripts\tests\Run-AllTests.ps1 -Verbose

# Kaikilla lisätoiminnoilla
.\scripts\tests\Run-AllTests.ps1 -Verbose -SecurityAudit -CheckOutdated

# Jatka virheistä huolimatta
.\scripts\tests\Run-AllTests.ps1 -ContinueOnError

# Tallenna tulokset JSON-muodossa
.\scripts\tests\Run-AllTests.ps1 -OutputFormat JSON -OutputPath "./test-results"

# Tallenna JUnit XML -muodossa (CI/CD)
.\scripts\tests\Run-AllTests.ps1 -OutputFormat JUnit -OutputPath "./test-results"
```

## 🚀 Käyttö CI/CD-putkissa

### GitHub Actions

```yaml
name: DevOps Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run DevOps Tests
        run: .\scripts\tests\Run-AllTests.ps1 -Verbose -SecurityAudit -OutputFormat JUnit -OutputPath "./test-results"
        shell: pwsh
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

### Azure DevOps

```yaml
trigger:
  - main
  - develop

pool:
  vmImage: 'windows-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'
  
  - script: npm install
    displayName: 'Install dependencies'
  
  - task: PowerShell@2
    displayName: 'Run DevOps Tests'
    inputs:
      targetType: 'filePath'
      filePath: '$(System.DefaultWorkingDirectory)/scripts/tests/Run-AllTests.ps1'
      arguments: '-Verbose -SecurityAudit -OutputFormat JUnit -OutputPath "$(System.DefaultWorkingDirectory)/test-results"'
  
  - task: PublishTestResults@2
    displayName: 'Publish Test Results'
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/test-results/*.xml'
```

### GitLab CI

```yaml
test:
  stage: test
  image: mcr.microsoft.com/windows/servercore:ltsc2019
  script:
    - npm install
    - pwsh -File .\scripts\tests\Run-AllTests.ps1 -Verbose -SecurityAudit -OutputFormat JUnit -OutputPath "./test-results"
  artifacts:
    when: always
    reports:
      junit: test-results/*.xml
```

## 📊 Tulosten tulkinta

### Exit-koodit
- **0**: Kaikki testit läpäisty
- **1**: Yksi tai useampi testi epäonnistui

### Testien kategoriat

#### ✅ PASS
Testi läpäisi - kaikki kunnossa

#### ✗ FAIL
Testi epäonnistui - vaatii huomiota ja korjausta

#### ⚠ WARN
Varoitus - ei estä buildia, mutta kannattaa tarkistaa

## 🔧 Kustomointi

### Lisää uusi testiskripti

1. Luo uusi `.ps1`-tiedosto `scripts/tests/` -kansioon
2. Käytä samaa rakennetta kuin olemassa olevissa skripteissä:
   ```powershell
   param([switch]$Verbose)
   
   $script:TestResults = @{
       Total = 0
       Passed = 0
       Failed = 0
   }
   
   function Write-TestResult { ... }
   function Test-YourFeature { ... }
   function Show-TestSummary { ... }
   ```

3. Lisää testisuite `Run-AllTests.ps1` -tiedostoon

### Muuta testiparametreja

Voit muokata testien käyttäytymistä parametrien avulla:
- Lisää `-Verbose` nähdäksesi yksityiskohtaista tietoa
- Käytä `-ContinueOnError` jatkaakseen seuraaviin testeihin virheistä huolimatta
- Tallenna tulokset `-OutputFormat` -parametrilla

## 🛠️ Kehitys ja debuggaus

### Testaa yksittäinen skripti
```powershell
# Aja yksittäinen testi
.\scripts\tests\Test-CodeQuality.ps1 -Verbose

# Debuggaa PowerShell-komentosarjaa
Set-PSDebug -Trace 1
.\scripts\tests\Test-CodeQuality.ps1
Set-PSDebug -Trace 0
```

### Ajastaminen

Voit ajaa testit automaattisesti Windowsissa:

```powershell
# Luo ajastettu tehtävä
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File C:\path\to\Run-AllTests.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "DevOpsTests" -Action $action -Trigger $trigger
```

## 📝 Best Practices

1. **Aja testit ennen committia**
   ```powershell
   .\scripts\tests\Run-AllTests.ps1 -Verbose
   ```

2. **Käytä pre-commit hookia**
   Lisää `.git/hooks/pre-commit`:
   ```bash
   #!/bin/sh
   pwsh -File scripts/tests/Run-AllTests.ps1
   ```

3. **Tarkista tulokset säännöllisesti**
   - Korjaa FAIL-testit heti
   - Tutki WARN-varoitukset
   - Pidä riippuvuudet ajan tasalla

4. **Dokumentoi muutokset**
   - Jos lisäät uusia testejä, päivitä tämä README
   - Kommentoi skriptit hyvin
   - Käytä kuvaavia testinimi

## 🤝 Kontribuointi

Kun lisäät uusia testejä:
1. Noudata olemassa olevaa rakennetta
2. Lisää yksityiskohtaiset kommentit
3. Testaa sekä pass- että fail-skenaariot
4. Päivitä dokumentaatio
5. Varmista yhteensopivuus CI/CD-kanssa

## 📞 Tuki

Jos törmäät ongelmiin:
1. Tarkista virheviestit `-Verbose` -tilassa
2. Varmista että kaikki riippuvuudet on asennettu
3. Tarkista PowerShell-versio: `$PSVersionTable.PSVersion`
4. Varmista execution policy: `Get-ExecutionPolicy`

## 📄 Lisenssi

Osa ParentsTeachersApp-projektia.
