# agent-isles desktop launcher (local preview)

[简体中文](README.md) · **English**

Release packages include Node.js, pinned DSH dependencies, the Web plugins, and exported Godot assets. They do not require source code, Yarn, or a preinstalled Node.js runtime.

| Platform | Artifact | Status |
| --- | --- | --- |
| Windows 10/11 x64 | Installer EXE and portable ZIP | Available |
| macOS Intel (x86_64) | Portable ZIP containing `Agent Isles.app` | Preview |
| macOS Apple Silicon (arm64) | Portable ZIP containing `Agent Isles.app` | Preview |

## Windows usage

Run `agent-isles-setup-x64.exe`, then launch agent-isles from the desktop or Start menu. The launcher waits for the service and page to become ready, then opens the current authenticated URL in your default browser. Launching it again, or selecting "Open island" from the notification-area menu, reuses the same service. The operating system selects the port, which listens only on the local loopback interface.

Closing the browser does not stop active work. Select "Exit" from the agent-isles notification-area menu to stop the service. The process tree runs in a Windows Job Object, so normal or forced launcher termination also cleans up its child processes.

If the Host service exits unexpectedly, the existing Node supervisor retries after 1, 3, and 10 seconds on the port assigned for this launch without resubmitting tasks. Normal exits are not retried. After three consecutive failures, the launcher displays a stopped-service message. `service.log` records timestamped exit codes and retry reasons, rotates old content, and sanitizes entry tokens. The Job Object still owns final cleanup when the launcher exits.

User data is stored in `%LOCALAPPDATA%\agent-isles\data`; installed files are stored in `%LOCALAPPDATA%\Programs\agent-isles`. Uninstall through Windows Installed apps after exiting the launcher. Uninstallation preserves user data. The current installer does not overwrite an existing installation, so uninstall the old version before upgrading. The portable ZIP can be extracted and run directly and does not register an uninstall entry.

## macOS usage

Download `agent-isles-darwin-x64.zip` on an Intel Mac or `agent-isles-darwin-arm64.zip` on an Apple Silicon Mac. Extract the entire archive to a short path and open `Agent Isles.app`. The launcher appears in the menu bar and opens your default browser after the service is ready. Opening the app again asks the running instance to reopen the island. Use "Quit agent-isles" from the menu-bar item to stop it.

User data is stored in `~/Library/Application Support/agent-isles/data`. The preview is unsigned. If Gatekeeper blocks it, right-click and choose Open, or allow it in System Settings. There is currently no `.pkg` installer or automatic updater.

You must configure your own model. Project tools such as Git and Python are not included. Current preview packages are unsigned and do not provide automatic updates or an online account system.

## Build and verify

### Windows x64

```powershell
corepack yarn build:web
corepack yarn build:world
node apps/desktop/build.mjs
powershell -NoProfile -File apps/desktop/verify.ps1 -BuildDirectory (Get-Content dist/desktop-latest.txt)
```

The build uses the Windows .NET Framework C# compiler and Inno Setup 6. Set the `ISCC` environment variable when Inno Setup is installed in a nonstandard location. It copies the current Node executable and installed dependencies, which must first be installed from the repository lockfile. The installer uses the modern style with LZMA2 normal compression. Installer and portable packages omit type declarations and JavaScript source maps while preserving source, package metadata, and licenses. The build downloads the license for the selected Node version; release execution does not install dependencies from the network. `dist/desktop-*/` contains the installer EXE, portable ZIP, and SHA-256 files and must not be committed. Development homes, credentials, and user projects are never copied into a release.

The verification script silently installs to an isolated path containing spaces and records installation time. `/TESTINSTALL=1` skips uninstall registration and shortcuts so it does not affect an existing installation. It then checks for links back to source and uses a fresh data directory outside the repository to test authentication, the home page, world assets, shutdown cleanup, and native module loading. The installer UI, desktop shortcut, upgrades, uninstall UI, and complete model workflow still require manual release verification.

### macOS Intel / Apple Silicon

Run natively on a Mac matching the target architecture; do not build from a Rosetta terminal. Install Godot 4.7.2 and its matching Web export templates, or configure `GODOT_BIN`:

```bash
corepack yarn build:web
corepack yarn build:world
corepack yarn build:desktop:darwin
corepack yarn verify:desktop:darwin
```

The Swift menu-bar launcher source is in `apps/desktop/macos/Launcher.swift` and is compiled with the system `swiftc` from Command Line Tools, targeting macOS 12 or later. Packaging shares `apps/desktop/pack-app.mjs` with Windows and copies the current architecture's Node runtime and native dependencies. Intel and Apple Silicon packages must be installed, built, and verified separately in matching native environments. Artifacts are written to `dist/desktop-darwin-*/`, including `agent-isles-darwin-x64.zip` or `agent-isles-darwin-arm64.zip` and `SHA256SUMS.txt`. Verification covers binary architecture, readiness smoke tests, process cleanup on exit, single-instance behavior, and native module loading.

An online edition would require a separate account authentication and permission-isolation design; local temporary credentials are not an online login solution.

Prefer a short installation path. Deep dependency trees may encounter MoveFile code 3 under excessively long target paths. Release packages omit type declarations and JavaScript source maps; use the development environment when dependency debugging requires them.
