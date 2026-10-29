param([string]$Action = 'serve')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$java = $null
$pathFile = Join-Path $root 'java-path.txt'
if (Test-Path $pathFile) {
 $chosen = (Get-Content $pathFile -Encoding UTF8 | Select-Object -First 1).Trim().Trim('"')
 if (Test-Path (Join-Path $chosen 'bin\java.exe')) { $java = Join-Path $chosen 'bin\java.exe' }
 elseif (Test-Path (Join-Path $chosen 'java.exe')) { $java = Join-Path $chosen 'java.exe' }
 elseif ((Test-Path $chosen -PathType Leaf) -and $chosen.EndsWith('java.exe')) { $java = $chosen }
 else { Write-Host 'java-path.txt does not point to a Java installation. Read START_HERE.html.'; exit 1 }
}
if (-not $java -and $env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { $java = Join-Path $env:JAVA_HOME 'bin\java.exe' }
if (-not $java) { $found = Get-Command java.exe -ErrorAction SilentlyContinue; if ($found) { $java = $found.Source } }
if (-not $java) {
 Write-Host 'Java was not found. Open Spring Tools: Window > Preferences > Java > Installed JREs.'
 Write-Host 'Copy the Java/JDK home directory into java-path.txt next to ClassroomLive.jar.'
 Write-Host 'Use Java 17 or newer with keytool. Read START_HERE.html.'
 exit 1
}
Write-Host "Java: $java"
& $java '-Dfile.encoding=UTF-8' '--add-modules' 'jdk.httpserver' '-jar' (Join-Path $root 'ClassroomLive.jar') $Action
$status = $LASTEXITCODE
if ($status -ne 0) { Write-Host 'Check the error above. Java 17+ is required; do not delete data.' }
exit $status
