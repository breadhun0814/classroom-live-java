$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
 Write-Host 'Right-click 03-Firewall.cmd and choose Run as administrator on the SERVER PC.'
 exit 1
}
$root = Split-Path $PSScriptRoot -Parent
$config = Get-Content (Join-Path $root 'data\server.json') -Encoding UTF8 -Raw | ConvertFrom-Json
Get-NetFirewallRule -Name 'ClassroomLiveJavaLAN-HTTPS' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -Name 'ClassroomLiveJavaLAN-HTTPS' -DisplayName 'Classroom Live Java LAN HTTPS' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $config.port -RemoteAddress $config.allowed_cidrs -Profile Any | Out-Null
Write-Host "Allowed TCP $($config.port) only from $($config.allowed_cidrs -join ', ')."
Write-Host 'Browser video permissions are separate. Do not disable Windows Firewall.'
