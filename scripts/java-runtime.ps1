# Shared Java discovery and optional folder-local Eclipse Temurin installation.
# Dot-source this file. It never edits PATH, JAVA_HOME, the registry or certificates.
function Get-ClassroomJavaInfo {
 param([string]$Candidate)
 if ([string]::IsNullOrWhiteSpace($Candidate)) { return $null }
 $chosen = [Environment]::ExpandEnvironmentVariables($Candidate.Trim().Trim('"'))
 if (Test-Path -LiteralPath $chosen -PathType Container) {
  if (Test-Path -LiteralPath (Join-Path $chosen 'bin\java.exe')) { $chosen = Join-Path $chosen 'bin\java.exe' }
  else { $chosen = Join-Path $chosen 'java.exe' }
 }
 if (-not (Test-Path -LiteralPath $chosen -PathType Leaf)) { return $null }
 $bin = Split-Path ([IO.Path]::GetFullPath($chosen)) -Parent
 $jdkHome = Split-Path $bin -Parent
 $release = Join-Path $jdkHome 'release'
 if (-not (Test-Path -LiteralPath $release)) { return $null }
 $metadata = Get-Content -LiteralPath $release -Raw
 if ($metadata -notmatch '(?m)^JAVA_VERSION="(?<major>\d+)[^"]*"') { return $null }
 $major = [int]$Matches.major
 if ($major -lt 17) { return $null }
 foreach ($exe in @('java.exe','javaw.exe','keytool.exe')) {
  if (-not (Test-Path -LiteralPath (Join-Path $bin $exe) -PathType Leaf)) { return $null }
 }
 if ($metadata -match '(?m)^MODULES="([^"]+)"') {
  $modules = $Matches[1].Split(' ')
  if ('jdk.httpserver' -notin $modules -or 'java.desktop' -notin $modules) { return $null }
 }
 [pscustomobject]@{ Java=(Join-Path $bin 'java.exe'); Javaw=(Join-Path $bin 'javaw.exe'); Home=$jdkHome; Major=$major }
}

function Find-ClassroomJava {
 param([Parameter(Mandatory=$true)][string]$Root)
 $pathFile = Join-Path $Root 'java-path.txt'
 if (Test-Path -LiteralPath $pathFile) {
  $line = Get-Content -LiteralPath $pathFile -Encoding UTF8 | Select-Object -First 1
  $pinned = Get-ClassroomJavaInfo $line
  if ($pinned) { return $pinned }
  throw 'java-path.txt의 경로에서 Java 17+ / javaw / keytool을 찾지 못했습니다. 파일을 확인하거나 별도 보관한 뒤 다시 실행하세요.'
 }
 $candidates = @((Join-Path $Root '.runtime\java'),$env:JAVA_HOME)
 $onPath = Get-Command java.exe -ErrorAction SilentlyContinue
 if ($onPath) { $candidates += $onPath.Source }
 foreach ($key in @('HKLM:\SOFTWARE\JavaSoft\JDK','HKLM:\SOFTWARE\JavaSoft\Java Development Kit','HKLM:\SOFTWARE\Eclipse Adoptium\JDK','HKLM:\SOFTWARE\Microsoft\JDK')) {
  if (Test-Path $key) {
   foreach ($child in @(Get-ChildItem -Path $key -ErrorAction SilentlyContinue)) {
    $values = Get-ItemProperty -LiteralPath $child.PSPath -ErrorAction SilentlyContinue
    foreach ($property in @('JavaHome','Path')) { if ($values.$property) { $candidates += $values.$property } }
   }
  }
 }
 foreach ($directory in @('Java','Eclipse Adoptium','Microsoft','Amazon Corretto')) {
  if ($env:ProgramFiles) {
   $parent = Join-Path $env:ProgramFiles $directory
   if (Test-Path -LiteralPath $parent) { $candidates += @(Get-ChildItem -LiteralPath $parent -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -ExpandProperty FullName) }
  }
 }
 foreach ($candidate in $candidates) { $info = Get-ClassroomJavaInfo $candidate; if ($info) { return $info } }
 return $null
}

function Expand-ClassroomJavaArchive {
 param([Parameter(Mandatory=$true)][string]$Archive,[Parameter(Mandatory=$true)][string]$Destination)
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $destinationPath = [IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
 $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
 try {
  foreach ($entry in $zip.Entries) {
   $target = [IO.Path]::GetFullPath((Join-Path $Destination $entry.FullName))
   if (-not $target.StartsWith($destinationPath,[StringComparison]::OrdinalIgnoreCase)) { throw 'Java ZIP에 설치 폴더를 벗어나는 경로가 있습니다.' }
  }
 } finally { $zip.Dispose() }
 [IO.Compression.ZipFile]::ExtractToDirectory($Archive,$Destination)
}

function Install-ClassroomJava {
 param([Parameter(Mandatory=$true)][string]$Root)
 $osArch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
 $arch = switch ($osArch) { 'AMD64' { 'x64' }; 'ARM64' { 'aarch64' }; default { throw 'Java 자동 준비는 Windows x64/ARM64를 지원합니다. Java 17+ JDK를 직접 준비하세요.' } }
 $runtimeRoot = [IO.Path]::GetFullPath((Join-Path $Root '.runtime'))
 $target = [IO.Path]::GetFullPath((Join-Path $runtimeRoot 'java'))
 if (Test-Path -LiteralPath $target) { throw '.runtime\java 폴더가 이미 있지만 사용할 수 없습니다. 기존 파일을 별도 보관한 뒤 다시 실행하세요.' }
 New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
 $stage = Join-Path $runtimeRoot ('download-' + [guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $stage | Out-Null
 $archive = Join-Path $stage 'temurin.zip'
 $extract = Join-Path $stage 'extracted'
 $priorTls = [Net.ServicePointManager]::SecurityProtocol
 $priorProgress = $ProgressPreference
 try {
  [Net.ServicePointManager]::SecurityProtocol = $priorTls -bor [Net.SecurityProtocolType]::Tls12
  $ProgressPreference = 'SilentlyContinue'
  $api = "https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=$arch&image_type=jdk&os=windows&vendor=eclipse"
  Write-Host 'Eclipse Temurin 21 JDK 정보를 확인하고 있습니다...'
  $assets = @(Invoke-RestMethod -Uri $api -UseBasicParsing -TimeoutSec 45)
  $package = $assets[0].binary.package
  if (-not $package -or $package.checksum -notmatch '^[a-fA-F0-9]{64}$') { throw '공식 API의 Java 다운로드 정보를 확인할 수 없습니다.' }
  $link = [uri]$package.link
  if ($link.Scheme -ne 'https' -or $link.Host -ne 'github.com' -or -not $link.AbsolutePath.StartsWith('/adoptium/temurin21-binaries/releases/download/')) { throw '예상한 Eclipse Temurin 공식 다운로드 주소가 아닙니다.' }
  Write-Host 'Java를 이 프로그램 폴더에 다운로드합니다. 잠시 기다려 주세요.'
  Invoke-WebRequest -Uri $link.AbsoluteUri -OutFile $archive -UseBasicParsing -TimeoutSec 600
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ine $package.checksum) { throw 'Java 다운로드의 SHA-256 검증이 실패했습니다. 받은 파일을 실행하지 않습니다.' }
  Expand-ClassroomJavaArchive -Archive $archive -Destination $extract
  $homes = @(Get-ChildItem -LiteralPath $extract -Directory | Where-Object { Get-ClassroomJavaInfo $_.FullName })
  if ($homes.Count -ne 1) { throw '다운로드한 Java 폴더를 확인할 수 없습니다.' }
  $source = [IO.Path]::GetFullPath($homes[0].FullName)
  if (-not $source.StartsWith(([IO.Path]::GetFullPath($stage) + '\'),[StringComparison]::OrdinalIgnoreCase) -or $target -ne (Join-Path $runtimeRoot 'java')) { throw 'Java 이동 대상 경로를 확인할 수 없습니다.' }
  Move-Item -LiteralPath $source -Destination $target
  $installed = Get-ClassroomJavaInfo $target
  if (-not $installed) { throw 'Java 준비를 완료하지 못했습니다.' }
  return $installed
 } finally {
  [Net.ServicePointManager]::SecurityProtocol = $priorTls
  $ProgressPreference = $priorProgress
  # Delete only the uniquely created download staging folder under this runtime root.
  $resolvedStage = [IO.Path]::GetFullPath($stage)
  if ($resolvedStage.StartsWith(($runtimeRoot + '\'),[StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolvedStage) -match '^download-[a-f0-9]{32}$') { Remove-Item -LiteralPath $resolvedStage -Recurse -Force -ErrorAction SilentlyContinue }
 }
}

function Get-ClassroomCidr {
 param([string]$Address,[int]$PrefixLength)
 if ($PrefixLength -lt 1 -or $PrefixLength -gt 32) { throw '지원하지 않는 IPv4 접두사입니다.' }
 $parts = $Address.Split('.')
 if ($parts.Count -ne 4) { throw 'IPv4 주소가 필요합니다.' }
 [long]$number = 0
 foreach ($part in $parts) { if ($part -notmatch '^\d{1,3}$' -or [int]$part -gt 255) { throw 'IPv4 주소를 확인하세요.' }; $number = ($number -shl 8) -bor [int]$part }
 [long]$mask = (4294967295 -shl (32-$PrefixLength)) -band 4294967295
 $network = $number -band $mask
 return ((24,16,8,0 | ForEach-Object { ($network -shr $_) -band 255 }) -join '.') + '/' + $PrefixLength
}

function Get-ClassroomNetworkHint {
 try {
  $routes = @(Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop | Sort-Object RouteMetric,InterfaceMetric)
  foreach ($route in $routes) {
   $addresses = @(Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.AddressState -eq 'Preferred' -and ($_.IPAddress -match '^10\.' -or $_.IPAddress -match '^192\.168\.' -or $_.IPAddress -match '^172\.(1[6-9]|2\d|3[01])\.') })
   if ($addresses.Count -gt 0) { $address = $addresses[0]; return [pscustomobject]@{ Address=$address.IPAddress; Cidr=(Get-ClassroomCidr $address.IPAddress $address.PrefixLength); Adapter=$address.InterfaceAlias } }
  }
 } catch { return $null }
 return $null
}
