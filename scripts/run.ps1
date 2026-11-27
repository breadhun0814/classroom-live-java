param([string]$Action = 'serve')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
. (Join-Path $PSScriptRoot 'java-runtime.ps1')
try { $javaInfo = Find-ClassroomJava -Root $root } catch { Write-Host $_.Exception.Message; exit 1 }
if (-not $javaInfo) { Write-Host 'Java 17+ JDK was not found. Run Start-Classroom.cmd to prepare Java in this folder.'; exit 1 }
$java = $javaInfo.Java
Write-Host "Java: $java"
& $java '-Dfile.encoding=UTF-8' '--add-modules' 'jdk.httpserver' '-jar' (Join-Path $root 'ClassroomLive.jar') $Action
$status = $LASTEXITCODE
if ($status -ne 0) { Write-Host 'Check the error above. Java 17+ is required; do not delete data.' }
exit $status
