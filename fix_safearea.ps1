# PowerShell script to fix SafeAreaView imports across all files
$files = @(
    "src\screens\FindTeachersScreen.js",
    "src\screens\ParentDashboard.js", 
    "src\screens\ParentSignupScreen.js",
    "src\screens\TeacherProfileScreen.js",
    "src\screens\TeacherSignupScreen.js"
)

foreach ($file in $files) {
    $fullPath = "c:\Users\eskot\Desktop\koodaus aineistoa\projektit\opiskelukansio\Näyttö\Uusi kansio\ParentsTeachersApp\$file"
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        # Remove SafeAreaView from react-native import
        $content = $content -replace "SafeAreaView,\s*", ""
        $content = $content -replace ",\s*SafeAreaView", ""
        $content = $content -replace "import { Ionicons }", "import { SafeAreaView } from 'react-native-safe-area-context';`nimport { Ionicons }"
        Set-Content $fullPath $content
        Write-Host "Fixed $file"
    }
}