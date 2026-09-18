#define AppName "QCode"
#define AppVersion "0.0.0-preview"
[Setup]
; Keep the historical AppId so QCode upgrades the existing agent-isles installation.
AppId={{7F3CEB5A-6A2E-4A79-9D2B-AGENTISLES}}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\QCode
UsePreviousAppDir=no
Uninstallable=not IsTestInstall
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=qcode-setup-x64
OutputDir={#SourcePath}
Compression=lzma2/normal
SolidCompression=yes
WizardStyle=modern
SetupIconFile={#SourcePath}\..\..\assets\brand\favicon.ico
UninstallDisplayIcon={app}\QCode.exe
ArchitecturesInstallIn64BitMode=x64
[Files]
Source: "{#SourcePath}\app\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
[Icons]
Name: "{autodesktop}\QCode"; Filename: "{app}\QCode.exe"; WorkingDir: "{app}"; Check: not IsTestInstall
Name: "{autoprograms}\QCode"; Filename: "{app}\QCode.exe"; WorkingDir: "{app}"; Check: not IsTestInstall
[Run]
Filename: "{app}\QCode.exe"; Description: "启动 QCode"; Flags: nowait postinstall skipifsilent
[Code]
function IsTestInstall: Boolean;
begin
  Result := ExpandConstant('{param:TESTINSTALL|0}') = '1';
end;
