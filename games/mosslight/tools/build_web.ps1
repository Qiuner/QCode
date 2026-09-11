param([string]$Godot = 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe')
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path -LiteralPath $Godot)) {
    $command = Get-Command godot, godot4 -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $command) { throw 'Godot was not found. Pass -Godot with the path to Godot 4.7.2.' }
    $Godot = $command.Source
}
$output = Join-Path $project 'build\web'
New-Item -ItemType Directory -Force -Path $output | Out-Null
Set-Content -LiteralPath (Join-Path $project 'build\.gdignore') -Value ''
& $Godot --headless --path $project --editor --import
if ($LASTEXITCODE -ne 0) { throw 'Godot resource import failed.' }
& $Godot --headless --path $project --script res://tools/check_ui_font.gd
if ($LASTEXITCODE -ne 0) { throw 'UI font coverage check failed. Regenerate it with tools/subset_font.py.' }
& $Godot --headless --path $project --export-release Web (Join-Path $output 'index.html')
if ($LASTEXITCODE -ne 0) { throw 'Web export failed. Install the matching Web export templates first.' }
& $Godot --headless --path $project --export-pack Neighbors (Join-Path $output 'neighbors.pck')
if ($LASTEXITCODE -ne 0) { throw 'Neighbor regions export failed.' }
Copy-Item -LiteralPath (Join-Path $project 'web\cover.webp') -Destination $output
Copy-Item -LiteralPath (Join-Path $project 'web\_headers') -Destination $output
Copy-Item -LiteralPath (Join-Path $project 'assets\fonts\OFL.txt') -Destination (Join-Path $output 'font-license.txt')
Copy-Item -LiteralPath (Join-Path $project 'assets\xi4u-LICENSE.txt') -Destination $output
& node (Join-Path $PSScriptRoot 'compress_web.mjs') $output
if ($LASTEXITCODE -ne 0) { throw 'Web asset compression failed.' }
Compress-Archive -Path (Join-Path $output '*') -DestinationPath (Join-Path $project 'build\mosslight-web.zip') -Force
Write-Host "Web export ready: $output"
Write-Host 'Serve this folder over HTTP(S), or run Play-Web.cmd.'
