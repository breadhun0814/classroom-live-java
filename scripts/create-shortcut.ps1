param([switch]$Quiet,[string]$ShortcutDirectory)
$ErrorActionPreference = 'Stop'
try {
 $root = Split-Path $PSScriptRoot -Parent
 $launcher = Join-Path $root 'Server-App.vbs'
 if (-not (Test-Path -LiteralPath $launcher)) { throw 'Server-App.vbs가 없습니다. 추가팩 전체를 기존 서버 폴더에 복사하세요.' }
 if (-not (Test-Path -LiteralPath (Join-Path $root 'data\server.json'))) { throw '기존 data\server.json이 있는 서버 폴더에서 실행하세요. data를 새로 만들거나 삭제하지 마세요.' }
 . (Join-Path $PSScriptRoot 'java-runtime.ps1')
 $javaInfo = Find-ClassroomJava -Root $root
 if (-not $javaInfo) { throw 'Java 17+ JDK를 찾지 못했습니다. Start-Classroom.cmd로 준비하세요.' }
 $java = $javaInfo.Java
 $javaw = Join-Path (Split-Path $java -Parent) 'javaw.exe'
 if (-not (Test-Path -LiteralPath $javaw)) { throw 'javaw.exe가 없습니다. 기존 Java 경로를 확인하세요.' }
 if (-not (Test-Path -LiteralPath (Join-Path $root 'ServerControl.jar'))) { throw 'ServerControl.jar가 없습니다. 추가팩 전체를 복사하세요.' }
 $shell = New-Object -ComObject WScript.Shell
 $desktop = if ($ShortcutDirectory) { [IO.Path]::GetFullPath($ShortcutDirectory) } else { $shell.SpecialFolders.Item('Desktop') }
 if (-not (Test-Path -LiteralPath $desktop -PathType Container)) { throw '바로가기를 저장할 폴더가 없습니다.' }
 $shortcutPath = Join-Path $desktop 'Classroom Live 서버.lnk'
 $shortcut = $shell.CreateShortcut($shortcutPath)
 $shortcut.TargetPath = $javaw
 $shortcut.Arguments = '-Dfile.encoding=UTF-8 --add-modules jdk.httpserver -jar "' + (Join-Path $root 'ServerControl.jar') + '" --start'
 $shortcut.WorkingDirectory = $root
 $shortcut.WindowStyle = 1
 $shortcut.Description = 'Classroom Live 서버 시작 및 종료'
 $appIcon = Join-Path $root 'ClassroomLive.ico'
 $shortcut.IconLocation = if (Test-Path -LiteralPath $appIcon) { $appIcon + ',0' } else { (Join-Path $env:SystemRoot 'System32\shell32.dll') + ',15' }
 $shortcut.Save()
 if (-not $Quiet) { $shell.Popup("바탕화면에 Classroom Live 서버 바로가기를 만들었습니다.`r`n이제 바로가기를 더블 클릭하면 검은 창 없이 서버 관리 앱이 열립니다.`r`n원본 서버 폴더는 이동하거나 삭제하지 마세요.",0,'Classroom Live',64) | Out-Null }
} catch {
 Write-Host $_.Exception.Message -ForegroundColor Red
 exit 1
}
