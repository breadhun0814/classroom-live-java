$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
try {
 $root = Split-Path $PSScriptRoot -Parent
 $java = $null
 $pathFile = Join-Path $root 'java-path.txt'
 if (Test-Path $pathFile) {
  $chosen = (Get-Content $pathFile -Encoding UTF8 | Select-Object -First 1).Trim().Trim('"')
  if (Test-Path (Join-Path $chosen 'bin\java.exe')) { $java = Join-Path $chosen 'bin\java.exe' }
  elseif (Test-Path (Join-Path $chosen 'java.exe')) { $java = Join-Path $chosen 'java.exe' }
  elseif ((Test-Path $chosen -PathType Leaf) -and $chosen.EndsWith('java.exe')) { $java = $chosen }
  else { throw 'java-path.txt의 Java 경로를 확인하세요. 기존 서버에서 사용하던 파일을 유지하세요.' }
 }
 if (-not $java -and $env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { $java = Join-Path $env:JAVA_HOME 'bin\java.exe' }
 if (-not $java) { $found = Get-Command java.exe -ErrorAction SilentlyContinue; if ($found) { $java = $found.Source } }
 if (-not $java) { throw 'Java 17 이상을 찾지 못했습니다. 기존 java-path.txt를 유지하거나 00-Java-Check.cmd로 확인하세요.' }
 $javaw = Join-Path (Split-Path $java -Parent) 'javaw.exe'
 if (-not (Test-Path $javaw)) { throw '같은 Java 폴더에 javaw.exe가 없습니다. 데스크톱용 JDK 17 이상을 사용하세요.' }
 if (-not (Test-Path (Join-Path $root 'data\server.json'))) { throw 'data\server.json이 없습니다. 기존 서버 폴더에 압축 안의 파일을 복사한 뒤 실행하세요. 새 서버는 먼저 01-Setup.cmd로 설정하세요.' }
 foreach ($name in @('ClassroomLive.jar','ServerControl.jar')) { if (-not (Test-Path (Join-Path $root $name))) { throw "$name 파일이 없습니다. 압축을 전부 해제해서 기존 서버 폴더로 복사하세요." } }
 $cp = (Join-Path $root 'ServerControl.jar') + ';' + (Join-Path $root 'ClassroomLive.jar')
 Start-Process -FilePath $javaw -WorkingDirectory $root -ArgumentList @('-Dfile.encoding=UTF-8','--add-modules','jdk.httpserver','-cp',('"' + $cp + '"'),'ServerControl',('"' + $root + '"'))
} catch {
 [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Classroom Live 서버 앱','OK','Error') | Out-Null
 exit 1
}
