const targets = {
  arm64: {
    archiveArch: 'arm64',
    displayName: 'macOS Apple Silicon（arm64）',
    fileArchitecture: 'arm64',
    swiftTarget: 'arm64-apple-macos12.0',
    unameArchitecture: 'arm64',
  },
  x64: {
    archiveArch: 'x64',
    displayName: 'macOS Intel（x86_64）',
    fileArchitecture: 'x86_64',
    swiftTarget: 'x86_64-apple-macos12.0',
    unameArchitecture: 'x86_64',
  },
}

export function resolveDarwinTarget(arch) {
  const target = targets[arch]
  if (!target) throw new Error(`macOS 便携包仅支持 x64 和 arm64，当前架构为 ${arch}`)
  return target
}
