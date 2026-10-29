Option Explicit
Dim shell, fso, root, scriptPath, powershell, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = fso.BuildPath(root, "scripts\control.ps1")
If Not fso.FileExists(scriptPath) Then
 MsgBox "scripts\control.ps1 is missing. Copy all update files into the existing server folder.", 16, "Classroom Live"
 WScript.Quit 1
End If
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
command = Chr(34) & powershell & Chr(34) & " -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & scriptPath & Chr(34)
shell.CurrentDirectory = root
shell.Run command, 0, False
