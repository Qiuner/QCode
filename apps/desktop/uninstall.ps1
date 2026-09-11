Add-Type -AssemblyName System.Windows.Forms
$installRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$expectedRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Programs/agent-isles'))
if ($installRoot -ne $expectedRoot) { throw '请通过 Windows 已安装的应用卸载正式安装版本。' }
if ([Windows.Forms.MessageBox]::Show('卸载 agent-isles？项目和个人数据将保留。请先从通知区域退出应用。', '卸载 agent-isles', 'OKCancel') -ne 'OK') { exit }
$active = Get-Process -Name 'agent-isles' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Join-Path $installRoot 'agent-isles.exe') }
if ($active) { [Windows.Forms.MessageBox]::Show('请先从通知区域退出 agent-isles，再重新卸载。'); exit 1 }
$shell = New-Object -ComObject WScript.Shell
foreach ($folder in @([Environment]::GetFolderPath('DesktopDirectory'), [Environment]::GetFolderPath('Programs'))) {
    $link = Join-Path $folder 'agent-isles.lnk'
    if ((Test-Path -LiteralPath $link) -and $shell.CreateShortcut($link).TargetPath -eq (Join-Path $installRoot 'agent-isles.exe')) { Remove-Item -LiteralPath $link }
}
Remove-Item -LiteralPath $installRoot -Recurse -Force -ErrorAction Stop
Remove-Item -LiteralPath 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/agent-isles' -ErrorAction SilentlyContinue
[Windows.Forms.MessageBox]::Show('已卸载。个人数据保留在用户目录中。')
