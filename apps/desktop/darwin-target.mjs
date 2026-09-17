const targets = {
  arm64: {
    archiveArch: 'arm64',
    displayName: 'macOS Apple Silicon（arm64）',
    fileArchitecture: 'arm64',
    minimumSystemVersion: '13.5',
    swiftTarget: 'arm64-apple-macos13.5',
    unameArchitecture: 'arm64',
  },
  x64: {
    archiveArch: 'x64',
    displayName: 'macOS Intel（x86_64）',
    fileArchitecture: 'x86_64',
    minimumSystemVersion: '13.5',
    swiftTarget: 'x86_64-apple-macos13.5',
    unameArchitecture: 'x86_64',
  },
}

export function resolveDarwinTarget(arch) {
  const target = targets[arch]
  if (!target) throw new Error(`macOS 便携包仅支持 x64 和 arm64，当前架构为 ${arch}`)
  return target
}
