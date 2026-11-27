param([switch]$DebugConsole)
$ErrorActionPreference = 'Stop'
try {
 $root = Split-Path $PSScriptRoot -Parent
 . (Join-Path $PSScriptRoot 'java-runtime.ps1')
 $javaInfo = Find-ClassroomJava -Root $root
 if (-not $javaInfo) { throw 'Java 17+ JDK를 찾지 못했습니다. Start-Classroom.cmd로 Java 준비부터 진행하세요.' }
 $java = $javaInfo.Java
 if (-not (Test-Path (Join-Path $root 'data\server.json'))) { throw 'data\server.json이 없습니다. 기존 서버 폴더에 압축 안의 파일을 복사한 뒤 실행하세요. 새 서버는 먼저 01-Setup.cmd로 설정하세요.' }
 foreach ($name in @('ClassroomLive.jar','ServerControl.jar')) { if (-not (Test-Path (Join-Path $root $name))) { throw "$name 파일이 없습니다. 압축을 전부 해제해서 기존 서버 폴더로 복사하세요." } }
 $cp = (Join-Path $root 'ServerControl.jar') + ';' + (Join-Path $root 'ClassroomLive.jar')
 Set-Location -LiteralPath $root
 $logDir = Join-Path $root 'data\logs'
 New-Item -ItemType Directory -Path $logDir -Force | Out-Null
 $log = Join-Path $logDir 'server-app-startup.log'
 $intro = "Classroom Live server app - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`nJava: $java`r`nServer folder: $root"
 Set-Content -LiteralPath $log -Value $intro -Encoding UTF8
 Write-Host $intro
 Write-Host 'Opening server control window. Keep this console open during class.'
 Write-Host "Startup log: $log"
 # Use console Java and wait: Java/module/classpath errors must remain visible.
 # Windows PowerShell 5.1 wraps native stderr in ErrorRecord; do not turn it into an early terminating error.
 if (-not $DebugConsole) {
  $javaw = Join-Path (Split-Path $java -Parent) 'javaw.exe'
  if (-not (Test-Path -LiteralPath $javaw)) { throw 'javaw.exe가 없습니다. Java 17 이상 데스크톱 JDK 경로를 확인하세요.' }
  $preflightArgs = @('-Dfile.encoding=UTF-8','--add-modules','jdk.httpserver','-jar',('"' + (Join-Path $root 'ServerControl.jar') + '"'),'--check')
  $stdout = Join-Path $logDir 'server-app-check.log'
  $stderr = Join-Path $logDir 'server-app-check-error.log'
  $check = Start-Process -FilePath $java -WorkingDirectory $root -ArgumentList $preflightArgs -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  if ($check.ExitCode -ne 0) {
   $details = Get-Content -LiteralPath $stderr -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
   throw "시작 전 확인에 실패했습니다. 기존 data 폴더와 Java 경로를 확인하세요.`r`n$details"
  }
  $guiArgs = @('-Dfile.encoding=UTF-8','--add-modules','jdk.httpserver','-cp',('"' + $cp + '"'),'ServerControl',('"' + $root + '"'),'--start')
  Start-Process -FilePath $javaw -WorkingDirectory $root -ArgumentList $guiArgs -WindowStyle Hidden | Out-Null
  exit 0
 }
 $ErrorActionPreference = 'Continue'
 & $java '-Dfile.encoding=UTF-8' '--add-modules' 'jdk.httpserver' '-cp' $cp 'ServerControl' $root '--start' 2>&1 | ForEach-Object {
  $line = $_.ToString()
  Write-Host $line
  Add-Content -LiteralPath $log -Value $line -Encoding UTF8
 }
 $code = $LASTEXITCODE
 $ErrorActionPreference = 'Stop'
 if ($code -ne 0) { Write-Host "Server app exited with error code $code. Read the error above or data\logs\server-app-startup.log." -ForegroundColor Red }
 exit $code
} catch {
 if (-not $DebugConsole) {
  try {
   $popup = New-Object -ComObject WScript.Shell
   $popup.Popup($_.Exception.Message + "`r`n`r`n서버 폴더의 Server-App-Debug.cmd로 실행하면 자세한 오류를 볼 수 있습니다.",0,'Classroom Live 서버 앱',16) | Out-Null
  } catch { Write-Error $_ }
 }
 Write-Host 'Classroom Live server app could not start:' -ForegroundColor Red
 Write-Host $_.Exception.Message -ForegroundColor Red
 Write-Host 'Keep this window open and send a screenshot of the error.'
 exit 1
}
