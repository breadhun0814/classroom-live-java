param([switch]$DownloadJava)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
. (Join-Path $repo 'scripts\java-runtime.ps1')
$script:checks = 0
function Assert-Install([bool]$Condition,[string]$Message) { if (-not $Condition) { throw $Message }; $script:checks++ }
function Run-SetupScript([string]$Script,[string]$Arguments,[string]$InputText='',[switch]$UseCmd) {
 $psi = New-Object Diagnostics.ProcessStartInfo
 $psi.FileName = 'powershell.exe'; $psi.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $Script + '" ' + $Arguments
 if ($UseCmd) { $psi.FileName=$env:ComSpec; $psi.Arguments='/d /s /c ""' + $Script + '" ' + $Arguments + '"' }
 $psi.WorkingDirectory = $repo; $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
 $psi.RedirectStandardInput = $true; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
 $psi.StandardOutputEncoding = New-Object Text.UTF8Encoding($false); $psi.StandardErrorEncoding = New-Object Text.UTF8Encoding($false)
 $process = New-Object Diagnostics.Process; $process.StartInfo = $psi
 $process.Start() | Out-Null
 $output = $process.StandardOutput.ReadToEndAsync(); $errors = $process.StandardError.ReadToEndAsync()
 if ($InputText) { $process.StandardInput.Write($InputText) }; $process.StandardInput.Close()
 if (-not $process.WaitForExit(45000)) { $process.Kill(); throw 'Setup test timed out.' }
 return [pscustomobject]@{ Code=$process.ExitCode; Output=$output.Result; Error=$errors.Result }
}
$build = [IO.Path]::GetFullPath((Join-Path $repo 'build'))
New-Item -ItemType Directory -Path $build -Force | Out-Null
$fixture = Join-Path $build ('install-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
try {
 foreach ($file in @(Get-ChildItem -LiteralPath (Join-Path $repo 'scripts') -Filter '*.ps1')) {
  $tokens = $null; $parseErrors = $null
  [Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$parseErrors) | Out-Null
  Assert-Install ($parseErrors.Count -eq 0) ('PowerShell syntax: ' + $file.Name + ': ' + ($parseErrors | Out-String))
 }
 $realJava = Find-ClassroomJava -Root $repo
 Assert-Install ($null -ne $realJava -and $realJava.Major -ge 17) 'Installed Java discovery'
 $fakeHome = Join-Path $fixture 'fake-jdk'; New-Item -ItemType Directory -Path (Join-Path $fakeHome 'bin') -Force | Out-Null
 foreach ($exe in @('java.exe','javaw.exe','keytool.exe')) { [IO.File]::WriteAllText((Join-Path $fakeHome ('bin\' + $exe)),'fixture') }
 [IO.File]::WriteAllText((Join-Path $fakeHome 'release'),'JAVA_VERSION="8.0.1"')
 Assert-Install ($null -eq (Get-ClassroomJavaInfo $fakeHome)) 'Reject old Java'
 [IO.File]::WriteAllText((Join-Path $fakeHome 'release'),"JAVA_VERSION=`"21.0.1`"`nMODULES=`"java.base java.desktop jdk.httpserver`"")
 Assert-Install ((Get-ClassroomJavaInfo $fakeHome).Major -eq 21) 'JDK metadata discovery'
 Remove-Item -LiteralPath (Join-Path $fakeHome 'bin\keytool.exe')
 Assert-Install ($null -eq (Get-ClassroomJavaInfo $fakeHome)) 'Reject missing keytool'
 [IO.File]::WriteAllText((Join-Path $fixture 'java-path.txt'),'Z:\not-a-jdk')
 $rejected = $false; try { Find-ClassroomJava -Root $fixture | Out-Null } catch { $rejected = $true }
 Assert-Install $rejected 'Invalid pinned path must not silently fall back'
 Remove-Item -LiteralPath (Join-Path $fixture 'java-path.txt')
 Assert-Install ((Get-ClassroomCidr '192.168.57.25' 24) -eq '192.168.57.0/24') 'IPv4 /24 suggestion'
 Assert-Install ((Get-ClassroomCidr '172.19.45.25' 16) -eq '172.19.0.0/16') 'IPv4 non-/24 suggestion'
 Assert-Install ((Get-ClassroomCidr '10.1.2.3' 32) -eq '10.1.2.3/32') 'IPv4 /32 suggestion'
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $badZip = Join-Path $fixture 'traversal.zip'; $zip = [IO.Compression.ZipFile]::Open($badZip,'Create')
 try { $entry=$zip.CreateEntry('../escaped.txt'); $writer=New-Object IO.StreamWriter($entry.Open()); $writer.Write('fixture'); $writer.Dispose() } finally { $zip.Dispose() }
 $rejected=$false; try { Expand-ClassroomJavaArchive $badZip (Join-Path $fixture 'unzip') } catch { $rejected=$true }
 Assert-Install ($rejected -and -not (Test-Path -LiteralPath (Join-Path $fixture 'escaped.txt'))) 'Reject ZIP traversal before extraction'
 function Invoke-RestMethod { param($Uri,[switch]$UseBasicParsing,$TimeoutSec); return [pscustomobject]@{binary=@{package=@{link='https://github.com/adoptium/temurin21-binaries/releases/download/test/test.zip';checksum=('0'*64)}}} }
 function Invoke-WebRequest { param($Uri,$OutFile,[switch]$UseBasicParsing,$TimeoutSec); Copy-Item -LiteralPath $badZip -Destination $OutFile }
 try {
  $tamperedRoot=Join-Path $fixture 'tampered-download'; New-Item -ItemType Directory -Path $tamperedRoot | Out-Null
  $rejected=$false;try{Install-ClassroomJava -Root $tamperedRoot | Out-Null}catch{$rejected=$_.Exception.Message.Contains('SHA-256')}
  Assert-Install ($rejected -and -not (Test-Path -LiteralPath (Join-Path $tamperedRoot '.runtime\java'))) 'Checksum mismatch blocks Java extraction and execution'
 } finally { Remove-Item Function:\Invoke-RestMethod; Remove-Item Function:\Invoke-WebRequest }
 $app = Join-Path $fixture '한글 서버 폴더'; New-Item -ItemType Directory -Path $app | Out-Null
 [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $repo 'downloads\ClassroomLive-Windows.zip'),$app)
 $app = Join-Path $app 'ClassroomLive'
 $matchesPackage=$true
 foreach($file in @(Get-ChildItem -LiteralPath $app -File -Recurse)) { $relative=$file.FullName.Substring($app.Length+1);if((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath (Join-Path $repo $relative)).Hash){$matchesPackage=$false} }
 Assert-Install $matchesPackage 'Every packaged runtime file matches current source artifact'
 Assert-Install (Test-Path -LiteralPath (Join-Path $app 'Start-Classroom.cmd')) 'Runtime ZIP has quick-start entry'
 Assert-Install (-not (Test-Path -LiteralPath (Join-Path $app 'data'))) 'Runtime ZIP excludes classroom data'
 Assert-Install (-not (Test-Path -LiteralPath (Join-Path $app 'src'))) 'Runtime ZIP excludes developer source'
 [IO.File]::WriteAllText((Join-Path $app 'java-path.txt'),$realJava.Home,(New-Object Text.UTF8Encoding($true)))
 $entry = Join-Path $app 'scripts\start-classroom.ps1'
 $check = Run-SetupScript $entry '-CheckOnly'
 Assert-Install ($check.Code -eq 0 -and -not (Test-Path -LiteralPath (Join-Path $app 'data'))) ('CheckOnly must be read-only: ' + $check.Output + $check.Error)
 $cmdCheck=Run-SetupScript (Join-Path $app 'Start-Classroom.cmd') '-CheckOnly' '' -UseCmd
 Assert-Install ($cmdCheck.Code -eq 0 -and -not (Test-Path -LiteralPath (Join-Path $app 'data'))) ('Actual CMD entry in Unicode/spaced path: ' + $cmdCheck.Output + $cmdCheck.Error)
 $setup = Run-SetupScript $entry '-SkipFirewall -SkipShortcut -NoLaunch' "192.168.57.25`n192.168.57.0/24`n8443`nteacher`nSyntheticPassword-123`nSyntheticPassword-123`n"
 Assert-Install ($setup.Code -eq 0) ('First-run setup: ' + $setup.Output + $setup.Error)
 $cfg = Get-Content -LiteralPath (Join-Path $app 'data\server.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 Assert-Install ($cfg.server_ip -eq '192.168.57.25' -and $cfg.allowed_cidrs[0] -eq '192.168.57.0/24') 'Explicit classroom settings retained'
 $files = @(Get-ChildItem -LiteralPath (Join-Path $app 'data') -File -Recurse)
 $hashes=@{}; foreach ($file in $files) { $hashes[$file.FullName]=(Get-FileHash -LiteralPath $file.FullName).Hash }
 $repeat = Run-SetupScript $entry '-SkipFirewall -SkipShortcut -NoLaunch'
 Assert-Install ($repeat.Code -eq 0) ('Repeated quick start: ' + $repeat.Output + $repeat.Error)
 foreach ($file in $files) { Assert-Install ((Get-FileHash -LiteralPath $file.FullName).Hash -eq $hashes[$file.FullName]) ('Keep existing data: ' + $file.Name) }
 $shortcutDir = Join-Path $fixture 'shortcuts'; New-Item -ItemType Directory -Path $shortcutDir | Out-Null
 $shortcutResult = Run-SetupScript (Join-Path $app 'scripts\create-shortcut.ps1') ('-Quiet -ShortcutDirectory "' + $shortcutDir + '"')
 Assert-Install ($shortcutResult.Code -eq 0) ('Shortcut creation in fixture: ' + $shortcutResult.Output + $shortcutResult.Error)
 $shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut((Join-Path $shortcutDir 'Classroom Live 서버.lnk'))
 Assert-Install ($shortcut.TargetPath -eq $realJava.Javaw -and $shortcut.WorkingDirectory -eq $app) 'Shortcut uses selected Java and correct Unicode working directory'
 Assert-Install ($shortcut.Arguments.EndsWith('--start') -and $shortcut.IconLocation.Contains('ClassroomLive.ico')) 'Desktop shortcut starts the server directly through javaw with its app icon'
 if ($DownloadJava) {
  $downloadContainer=Join-Path $fixture 'portable-java'; New-Item -ItemType Directory -Path $downloadContainer | Out-Null
  [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $repo 'downloads\ClassroomLive-Windows.zip'),$downloadContainer)
  $downloadRoot=Join-Path $downloadContainer 'ClassroomLive'
  $downloaded=Install-ClassroomJava -Root $downloadRoot
  Assert-Install ($downloaded.Major -eq 21) 'Downloaded, checksum-verified, extracted official Temurin 21'
  $probe = & $downloaded.Java --version
  Assert-Install ($LASTEXITCODE -eq 0 -and ($probe -join ' ') -match '21\.') 'Downloaded Java executes'
  Assert-Install ((Find-ClassroomJava -Root $downloadRoot).Home -eq $downloaded.Home) 'Folder-local Java is selected without editing PATH or JAVA_HOME'
  $fresh=Run-SetupScript (Join-Path $downloadRoot 'scripts\start-classroom.ps1') '-SkipFirewall -SkipShortcut -NoLaunch' "192.168.57.26`n192.168.57.0/24`n8443`nteacher`nSyntheticPassword-123`nSyntheticPassword-123`n"
  Assert-Install ($fresh.Code -eq 0 -and (Test-Path -LiteralPath (Join-Path $downloadRoot 'data\STUDENT_SETUP.zip'))) ('Fresh setup using downloaded Java: ' + $fresh.Output + $fresh.Error)
 }
 Write-Host "PASS $script:checks Windows installation checks; isolated runtime ZIP, first setup, repeat/data preservation, Unicode shortcut; no system firewall or certificate-store changes."
} finally {
 $resolved=[IO.Path]::GetFullPath($fixture)
 if ([IO.Path]::GetDirectoryName($resolved) -ne $build -or [IO.Path]::GetFileName($resolved) -notmatch '^install-test-[a-f0-9]{32}$') { throw 'Unexpected fixture cleanup path' }
 Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue
}
