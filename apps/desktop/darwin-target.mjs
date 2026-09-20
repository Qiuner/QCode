import { execFileSync } from 'node:child_process'

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

const ROSETTA_GUIDANCE = [
  '检测到 Apple Silicon 硬件（hw.optional.arm64=1）上以 x86_64 进程运行：这是 Rosetta 翻译环境，' +
    'uname 与 process.arch 都会显示为 Intel，无法产出可信的原生 x64 便携包；本检查也不会静默改为 arm64 输出。',
  '请改用与目标一致的原生环境后重试：',
  '1. 使用原生 arm64 的 Node 与终端：确认 node -p process.arch 输出 arm64，必要时在 Finder 对终端 App 的' +
    '「显示简介」取消勾选「使用 Rosetta 打开」，或执行 arch -arm64 /bin/zsh 进入原生 shell；',
  '2. 若确需构建 Intel x64 包，请在真正的 Intel Mac 上执行。',
].join('\n')

// 读取硬件级 Apple Silicon 标志。proc_translated 是逐进程信号，子进程读数会随 exec 链漂移；
// hw.optional.arm64 与调用方架构无关，Intel 与 Apple Silicon 判定因此稳定。
export function readHardwareArm64(exec = execFileSync) {
  let output
  try {
    output = String(exec('sysctl', ['-n', 'hw.optional.arm64'], { encoding: 'utf8' })).trim()
  } catch (error) {
    if (error?.status === 1 && /unknown oid/i.test(String(error?.stderr ?? ''))) return false
    throw new Error(
      `macOS 执行环境检测失败：无法从 sysctl.hw_optional.arm64 取得硬件架构（${error?.message ?? error}）。` +
        '这不代表架构不受支持，请先修复检测环境，勿据此继续构建。',
    )
  }
  if (output === '1') return true
  if (output === '0' || output === '') return false
  throw new Error(`macOS 执行环境检测失败：sysctl hw.optional.arm64 返回意外值「${output}」，请修复系统环境后重试`)
}

// 纯函数门禁：区分原生 Intel、原生 Apple Silicon 与翻译执行；输入全部注入，跨平台可测。
export function resolveHostDarwinTarget({ arch, hardwareArm64 }) {
  if (arch === 'arm64') return resolveDarwinTarget('arm64')
  if (arch === 'x64') {
    if (hardwareArm64) throw new Error(ROSETTA_GUIDANCE)
    return resolveDarwinTarget('x64')
  }
  return resolveDarwinTarget(arch)
}

export function detectDarwinHostTarget({ exec = execFileSync, arch = process.arch } = {}) {
  return resolveHostDarwinTarget({ arch, hardwareArm64: readHardwareArm64(exec) })
}

// 供 shell 侧复用同一规则：输出 eval 可加载的 NODE_ARCH / FILE_ARCH。
export function darwinHostShellEnv(target) {
  return `NODE_ARCH=${target.archiveArch}\nFILE_ARCH=${target.fileArchitecture}\n`
}

if (process.argv[2] === '--print-shell-env') {
  if (process.platform !== 'darwin') {
    console.error('需要在 macOS 上运行')
    process.exit(1)
  }
  try {
    process.stdout.write(darwinHostShellEnv(detectDarwinHostTarget()))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  process.exit(0)
}
