param([switch]$CheckOnly,[switch]$SkipFirewall,[switch]$SkipShortcut,[switch]$NoLaunch)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
. (Join-Path $PSScriptRoot 'java-runtime.ps1')
try {
 Write-Host "`nClassroom Live - 빠른 시작`n" -ForegroundColor Cyan
 foreach ($name in @('ClassroomLive.jar','ServerControl.jar')) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $name))) { throw "$name 파일이 없습니다. ZIP을 모두 압축 해제한 뒤 Start-Classroom.cmd를 실행하세요." }
 }
 $javaInfo = Find-ClassroomJava -Root $root
 if (-not $javaInfo) {
  if ($CheckOnly) { throw '사용할 수 있는 Java 17+ JDK가 없습니다. Start-Classroom.cmd를 실행하면 폴더 안에 Java를 준비할 수 있습니다.' }
  Write-Host 'Java 17+ JDK가 없습니다. Eclipse Temurin 21을 이 폴더에만 준비할 수 있습니다.'
  Write-Host 'Windows 시스템의 PATH나 JAVA_HOME은 변경하지 않습니다. 최초 다운로드에는 인터넷이 필요합니다.'
  $answer = Read-Host 'Java를 다운로드해 준비하려면 1, 취소하려면 다른 키를 입력하세요'
  if ($answer -ne '1') { Write-Host '설정을 취소했습니다. 기존 파일은 유지됩니다.'; exit 0 }
  $javaInfo = Install-ClassroomJava -Root $root
 }
 Write-Host "Java $($javaInfo.Major): $($javaInfo.Home)"
 & $javaInfo.Java '-Dfile.encoding=UTF-8' '-Dstdout.encoding=UTF-8' '--add-modules' 'jdk.httpserver' '-jar' (Join-Path $root 'ClassroomLive.jar') check
 if ($LASTEXITCODE -ne 0) { throw 'Java 확인에 실패했습니다. Java 17+ JDK와 keytool이 필요합니다.' }
 $configPath = Join-Path $root 'data\server.json'
 if ($CheckOnly) {
  Write-Host $(if (Test-Path -LiteralPath $configPath) { '기존 서버 설정이 있습니다. 빠른 시작에서 관리 앱을 열 수 있습니다.' } else { '새 서버입니다. 빠른 시작에서 최초 설정을 진행할 수 있습니다.' })
  exit 0
 }
 if (-not (Test-Path -LiteralPath $configPath)) {
  Write-Host "`n[최초 설정] 교실 주소와 관리자 계정을 한 번만 설정합니다." -ForegroundColor Cyan
  $hint = Get-ClassroomNetworkHint
  $previousIp = $env:CLASSROOM_SETUP_IP; $previousCidr = $env:CLASSROOM_SETUP_CIDR
  try {
   if ($hint) {
    $env:CLASSROOM_SETUP_IP = $hint.Address; $env:CLASSROOM_SETUP_CIDR = $hint.Cidr
    Write-Host "감지한 연결: $($hint.Adapter) / $($hint.Address) / $($hint.Cidr)"
    Write-Host '학교에서 사용할 네트워크가 맞는지 확인하세요. 맞으면 주소·대역 질문에서 Enter를 누르세요.'
   }
   & $javaInfo.Java '-Dfile.encoding=UTF-8' '-Dstdout.encoding=UTF-8' '--add-modules' 'jdk.httpserver' '-jar' (Join-Path $root 'ClassroomLive.jar') setup
   if ($LASTEXITCODE -ne 0) { throw '최초 설정이 완료되지 않았습니다. 표시된 오류를 확인하고 다시 실행하세요. data를 삭제하지 마세요.' }
  } finally { $env:CLASSROOM_SETUP_IP = $previousIp; $env:CLASSROOM_SETUP_CIDR = $previousCidr }
 }
 foreach ($file in @('data\classroom-data.json','data\tls\server.p12','data\tls\classroom-ca.crt','data\tls\store-password.txt')) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $file))) { throw "기존 설정 파일이 일부 없습니다: $file. data를 보관하고 설치 안내의 복구 절차를 확인하세요." }
 }
 $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
 if (-not $SkipFirewall) {
  $rule = Get-NetFirewallRule -Name 'ClassroomLiveJavaLAN-HTTPS' -ErrorAction SilentlyContinue
  $firewallReady = $false
  if ($rule -and $rule.Enabled -eq 'True' -and $rule.Action -eq 'Allow' -and $rule.Direction -eq 'Inbound') {
   $ports = @($rule | Get-NetFirewallPortFilter); $addresses = @($rule | Get-NetFirewallAddressFilter)
   $firewallReady = ($ports.LocalPort -contains [string]$config.port) -and (($ports.Protocol -contains 'TCP') -or ($ports.Protocol -contains '6')) -and ((@($addresses.RemoteAddress | Sort-Object) -join ',') -eq (@($config.allowed_cidrs | Sort-Object) -join ','))
  }
  if (-not $firewallReady) {
   Write-Host "`n[학생 PC 접속] 설정한 교실 대역에서 TCP $($config.port)만 허용합니다." -ForegroundColor Cyan
   $answer = Read-Host '방화벽 설정을 요청하려면 1, 지금 건너뛰려면 다른 키를 입력하세요'
   if ($answer -eq '1') {
    try {
     $firewallScript = Join-Path $PSScriptRoot 'firewall.ps1'
     $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $firewallScript + '"'))
     if ($process.ExitCode -ne 0) { throw '방화벽 설정 명령이 실패했습니다.' }
    } catch { Write-Host '방화벽 단계가 완료되지 않았습니다. 학생 접속 전에 03-Firewall.cmd를 관리자 권한으로 실행하세요.' -ForegroundColor Yellow }
   } else { Write-Host '방화벽 단계를 건너뛰었습니다. 학생 접속 전에 03-Firewall.cmd를 실행하세요.' -ForegroundColor Yellow }
  }
 }
 if (-not $SkipShortcut) {
  & (Join-Path $PSScriptRoot 'create-shortcut.ps1') -Quiet
  if ($LASTEXITCODE -ne 0) { Write-Host '바로가기를 만들지 못했습니다. Start-Classroom.cmd는 그대로 사용할 수 있습니다.' -ForegroundColor Yellow }
 }
 Write-Host "`n준비 완료: https://$($config.server_ip):$($config.port)/" -ForegroundColor Green
 Write-Host '학생에게 전달할 파일: data\STUDENT_SETUP.zip (학생 PC에는 Java가 필요 없습니다.)'
 if (-not $NoLaunch) {
  $argsForGui = @('-Dfile.encoding=UTF-8','--add-modules','jdk.httpserver','-jar',('"' + (Join-Path $root 'ServerControl.jar') + '"'),'--start')
  Start-Process -FilePath $javaInfo.Javaw -WorkingDirectory $root -ArgumentList $argsForGui -WindowStyle Hidden | Out-Null
  Write-Host '서버 관리 앱이 열리며 서버가 자동 시작됩니다. 다음부터는 바탕화면 [Classroom Live 서버]를 더블 클릭하세요. CMD 창이 뜨지 않습니다.'
 }
 exit 0
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; Write-Host '자세한 절차: install.html 또는 START_HERE.html'; exit 1 }
