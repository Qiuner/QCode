param([Parameter(Mandatory=$true)][string]$BuildDirectory)
$ErrorActionPreference = 'Stop'
$buildRoot = (Resolve-Path -LiteralPath $BuildDirectory).Path
$extractRoot = Join-Path ([IO.Path]::GetTempPath()) ('isles app ' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$installWatch = [Diagnostics.Stopwatch]::StartNew()
$setup = Start-Process -FilePath (Join-Path $buildRoot 'agent-isles-setup-x64.exe') -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/TESTINSTALL=1', ('/DIR="' + $extractRoot + '"'), ('/LOG="' + (Join-Path $buildRoot 'install-test.log') + '"')) -WindowStyle Hidden -Wait -PassThru
$installWatch.Stop()
Write-Output ('Install elapsed seconds: ' + [math]::Round($installWatch.Elapsed.TotalSeconds, 1))
if ($setup.ExitCode -ne 0) { throw 'Installer extraction failed' }
$links = Get-ChildItem -LiteralPath $extractRoot -Recurse -Attributes ReparsePoint
if ($links) { throw 'Distribution contains links to external files' }
$env:AGENT_ISLES_DATA_HOME = Join-Path ([IO.Path]::GetTempPath()) ('agent-isles isolated data ' + [guid]::NewGuid().ToString('N'))
$launcher = Start-Process -FilePath (Join-Path $extractRoot 'agent-isles.exe') -ArgumentList '--smoke-test' -WindowStyle Hidden -PassThru
if (-not $launcher.WaitForExit(110000)) { Stop-Process -Id $launcher.Id; throw 'Launcher timed out' }
if ($launcher.ExitCode -ne 0 -or -not (Test-Path (Join-Path $env:AGENT_ISLES_DATA_HOME 'smoke-ok.txt'))) { throw 'Launcher smoke failed; inspect isolated data/launcher.log' }
$url = [uri](Get-Content (Join-Path $env:AGENT_ISLES_DATA_HOME 'browser-url.txt') -Raw)
if (Get-NetTCPConnection -LocalPort $url.Port -State Listen -ErrorAction SilentlyContinue) { throw 'Service survived launcher exit' }
Push-Location -LiteralPath $extractRoot
try {
    & './runtime/node.exe' -e "for(const name of ['fs-ext','koffi','node-pty','node-addon-require-builtin']) {require(name); console.log(name+' loaded')}"
    if ($LASTEXITCODE -ne 0) { throw 'Native module loading failed' }
} finally { Pop-Location }
$env:AGENT_ISLES_DATA_HOME = Join-Path ([IO.Path]::GetTempPath()) ('agent-isles instance data ' + [guid]::NewGuid().ToString('N'))
$first = Start-Process -FilePath (Join-Path $extractRoot 'agent-isles.exe') -ArgumentList @('--smoke-test', '--smoke-hold') -WindowStyle Hidden -PassThru
try {
    $deadline = (Get-Date).AddSeconds(95)
    while (-not (Test-Path (Join-Path $env:AGENT_ISLES_DATA_HOME 'smoke-ok.txt'))) {
        if ($first.HasExited -or (Get-Date) -gt $deadline) { throw 'Held startup failed' }
        Start-Sleep -Milliseconds 200
    }
    $second = Start-Process -FilePath (Join-Path $extractRoot 'agent-isles.exe') -ArgumentList '--smoke-test' -WindowStyle Hidden -PassThru
    if (-not $second.WaitForExit(5000)) { Stop-Process -Id $second.Id; throw 'Single instance failed' }
    if ($second.ExitCode -ne 0 -or $first.HasExited) { throw 'Single instance handoff failed' }
    $heldUrl = [uri](Get-Content (Join-Path $env:AGENT_ISLES_DATA_HOME 'browser-url.txt') -Raw)
} finally { if (-not $first.HasExited) { Stop-Process -Id $first.Id; $first.WaitForExit() } }
Start-Sleep -Milliseconds 500
if (Get-NetTCPConnection -LocalPort $heldUrl.Port -State Listen -ErrorAction SilentlyContinue) { throw 'Service survived launcher termination' }
Write-Output 'PASS: installer extraction, no external links, authenticated pages, normal/crash cleanup, single instance, native modules'
