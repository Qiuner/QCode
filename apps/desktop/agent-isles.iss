#define AppName "agent-isles"
#define AppVersion "0.0.0-preview"
[Setup]
AppId={{7F3CEB5A-6A2E-4A79-9D2B-AGENTISLES}}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\agent-isles
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=agent-isles-setup-x64
OutputDir={#SourcePath}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
SetupIconFile={#SourcePath}\..\..\assets\brand\favicon.ico
UninstallDisplayIcon={app}\agent-isles.exe
ArchitecturesInstallIn64BitMode=x64
[Files]
Source: "{#SourcePath}\payload\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
[Icons]
Name: "{autodesktop}\agent-isles"; Filename: "{app}\agent-isles.exe"; WorkingDir: "{app}"
Name: "{autoprograms}\agent-isles"; Filename: "{app}\agent-isles.exe"; WorkingDir: "{app}"
[Run]
Filename: "{app}\agent-isles.exe"; Description: "启动 agent-isles"; Flags: nowait postinstall skipifsilent
