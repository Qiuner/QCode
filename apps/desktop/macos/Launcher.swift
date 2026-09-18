// QCode macOS 启动器：对标 Windows Launcher.cs —— 单实例、菜单栏、进程树清理、就绪后打开系统浏览器。
import AppKit
import Foundation

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
  private var statusItem: NSStatusItem?
  private var service: Process?
  private var url: URL?
  private var home: URL!
  private var logHandle: FileHandle?
  private var quitting = false
  private var smoke = false
  private var holdSmoke = false
  private var ready = false
  private var checking = false
  private var startedAt = Date()
  private var pollTimer: Timer?
  private var lockFD: Int32 = -1
  private var statusWindow: NSWindow?
  private var statusLabel: NSTextField?
  private let urlPattern = try! NSRegularExpression(
    pattern: #"^dsh web: (http://127\.0\.0\.1:\d+/\?token=[A-Za-z0-9_-]+)"#
  )

  private var termSource: DispatchSourceSignal?
  private var intSource: DispatchSourceSignal?
  private var servicePGID: Int32 = -1

  func applicationDidFinishLaunching(_ notification: Notification) {
    let args = CommandLine.arguments
    smoke = args.contains("--smoke-test")
    holdSmoke = args.contains("--smoke-hold")
    installSignalHandlers()

    do {
      home = try resolveDataHome()
      try FileManager.default.createDirectory(at: home, withIntermediateDirectories: true)
    } catch {
      let alert = NSAlert()
      alert.messageText = "QCode 无法启动"
      alert.informativeText = error.localizedDescription
      if !smoke { alert.runModal() }
      NSApp.terminate(nil)
      return
    }

    if !acquireSingleInstance() {
      signalReopen()
      exit(0)
    }

    openLog()
    buildStatusUI()
    if !smoke { buildMenuBar() }

    do {
      try startService()
    } catch {
      fail(error.localizedDescription)
      return
    }
    startedAt = Date()
    pollTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
      self?.tick()
    }
  }

  private func resolveDataHome() throws -> URL {
    let env = ProcessInfo.processInfo.environment
    let currentOverride = env["QCODE_DATA_HOME"]
    let legacyOverride = env["AGENT_ISLES_DATA_HOME"]
    if let currentOverride, let legacyOverride,
       URL(fileURLWithPath: currentOverride).standardizedFileURL != URL(fileURLWithPath: legacyOverride).standardizedFileURL {
      throw NSError(domain: "qcode", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "QCODE_DATA_HOME 与旧的 AGENT_ISLES_DATA_HOME 指向不同目录，请只保留一个设置。",
      ])
    }
    if let override = currentOverride ?? legacyOverride {
      return URL(fileURLWithPath: override, isDirectory: true).standardizedFileURL
    }

    let applicationSupport = smoke && env["QCODE_TEST_APPLICATION_SUPPORT"] != nil
      ? URL(fileURLWithPath: env["QCODE_TEST_APPLICATION_SUPPORT"]!, isDirectory: true)
      : FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let currentRoot = applicationSupport.appendingPathComponent("QCode", isDirectory: true)
    let legacyRoot = applicationSupport.appendingPathComponent("agent-isles", isDirectory: true)
    let currentExists = FileManager.default.fileExists(atPath: currentRoot.path)
    let legacyExists = FileManager.default.fileExists(atPath: legacyRoot.path)
    if currentExists && legacyExists {
      throw NSError(domain: "qcode", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "检测到 QCode 与 agent-isles 两份数据目录。为避免覆盖，请先合并或移走其中一份后重试。",
      ])
    }
    if !currentExists && legacyExists { try FileManager.default.moveItem(at: legacyRoot, to: currentRoot) }
    return currentRoot.appendingPathComponent("data", isDirectory: true)
  }

  private func installSignalHandlers() {
    signal(SIGTERM, SIG_IGN)
    signal(SIGINT, SIG_IGN)
    let term = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
    term.setEventHandler { [weak self] in self?.quitApp() }
    term.resume()
    termSource = term
    let intSrc = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
    intSrc.setEventHandler { [weak self] in self?.quitApp() }
    intSrc.resume()
    intSource = intSrc
  }

  func applicationWillTerminate(_ notification: Notification) {
    quitting = true
    pollTimer?.invalidate()
    stopServiceTree()
    if let statusItem { NSStatusBar.system.removeStatusItem(statusItem) }
    try? logHandle?.close()
    if lockFD >= 0 { close(lockFD) }
  }

  private func installRoot() -> URL {
    let exe = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath()
    let macosDir = exe.deletingLastPathComponent()
    if macosDir.lastPathComponent == "MacOS" {
      let contents = macosDir.deletingLastPathComponent()
      if contents.lastPathComponent == "Contents" {
        let siblingRoot = contents.deletingLastPathComponent().deletingLastPathComponent()
        if FileManager.default.fileExists(atPath: siblingRoot.appendingPathComponent("apps/desktop/boot.mjs").path) {
          return siblingRoot
        }
      }
    }
    return exe.deletingLastPathComponent()
  }

  private func acquireSingleInstance() -> Bool {
    let lockPath = home.appendingPathComponent(smoke ? "launcher-smoke.lock" : "launcher.lock").path
    lockFD = open(lockPath, O_RDWR | O_CREAT, 0o644)
    guard lockFD >= 0 else { return false }
    if flock(lockFD, LOCK_EX | LOCK_NB) != 0 {
      close(lockFD)
      lockFD = -1
      return false
    }
    return true
  }

  private func signalReopen() {
    let reopenPath = home.appendingPathComponent(smoke ? "launcher-smoke.reopen" : "launcher.reopen").path
    try? "\(Date().timeIntervalSince1970)\n".write(toFile: reopenPath, atomically: true, encoding: .utf8)
  }

  private func openLog() {
    let logURL = home.appendingPathComponent("launcher.log")
    FileManager.default.createFile(atPath: logURL.path, contents: nil)
    logHandle = try? FileHandle(forWritingTo: logURL)
    _ = try? logHandle?.seekToEnd()
  }

  private func log(_ line: String) {
    let redacted = line.replacingOccurrences(
      of: #"token=[A-Za-z0-9_-]+"#,
      with: "token=[redacted]",
      options: .regularExpression
    )
    if let data = (redacted + "\n").data(using: .utf8) {
      try? logHandle?.write(contentsOf: data)
    }
  }

  private func buildMenuBar() {
    let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    item.button?.title = "AI"
    item.button?.toolTip = "QCode"
    let menu = NSMenu()
    menu.addItem(NSMenuItem(title: "打开小岛", action: #selector(openIsland), keyEquivalent: "o"))
    menu.addItem(NSMenuItem(title: "打开日志目录", action: #selector(openLogs), keyEquivalent: "l"))
    menu.addItem(NSMenuItem.separator())
    menu.addItem(NSMenuItem(title: "退出 QCode", action: #selector(quitApp), keyEquivalent: "q"))
    item.menu = menu
    statusItem = item
  }

  private func buildStatusUI() {
    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 440, height: 160),
      styleMask: [.titled, .closable, .miniaturizable],
      backing: .buffered,
      defer: false
    )
    window.title = "QCode"
    window.center()
    window.isReleasedWhenClosed = false
    window.delegate = self
    let label = NSTextField(labelWithString: "正在准备小岛…")
    label.frame = NSRect(x: 24, y: 40, width: 392, height: 80)
    label.maximumNumberOfLines = 4
    window.contentView?.addSubview(label)
    statusWindow = window
    statusLabel = label
    if smoke { window.orderOut(nil) } else { window.makeKeyAndOrderFront(nil) }
  }

  private func startService() throws {
    let root = installRoot()
    let node = root.appendingPathComponent("runtime/node")
    let boot = root.appendingPathComponent("apps/desktop/boot.mjs")
    guard FileManager.default.isExecutableFile(atPath: node.path) else {
      throw NSError(domain: "qcode", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "缺少 runtime/node，请使用 Mac 便携包或重新构建。",
      ])
    }
    guard FileManager.default.fileExists(atPath: boot.path) else {
      throw NSError(domain: "qcode", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "缺少 apps/desktop/boot.mjs。",
      ])
    }

    let process = Process()
    process.executableURL = node
    process.arguments = [boot.path, "--no-open", "--host", "127.0.0.1", "--port", "0"]
    process.currentDirectoryURL = root
    var env = ProcessInfo.processInfo.environment
    env["DSH_HOME"] = home.path
    env["QCODE_DESKTOP"] = "1"
    env["PATH"] = root.appendingPathComponent("runtime").path + ":" + (env["PATH"] ?? "")
    process.environment = env

    let out = Pipe()
    let err = Pipe()
    let input = Pipe()
    process.standardOutput = out
    process.standardError = err
    process.standardInput = input

    try process.run()
    service = process
    let pid = process.processIdentifier
    // Own process group so SIGTERM/SIGKILL to the group can reap Node + dsh descendants (Job Object analogue).
    if setpgid(pid, pid) == 0 {
      servicePGID = pid
    } else {
      // After Process.run(), the child may already have exec'd and Darwin can
      // reject setpgid with EACCES. Never signal an inherited process group.
      servicePGID = -1
      log("未能为后台服务创建独立进程组，将按子进程树清理。")
    }
    // Windows Launcher waits for Job assignment before stdin "start"; here the process is already ours.
    input.fileHandleForWriting.write("start\n".data(using: .utf8)!)

    wirePipe(out)
    wirePipe(err)

    process.terminationHandler = { [weak self] _ in
      DispatchQueue.main.async {
        guard let self, !self.quitting, !self.ready || self.holdSmoke else { return }
        if self.smoke && self.ready { return }
        self.fail("小岛服务已停止。请退出后重新打开应用。详情见日志目录。")
      }
    }
  }

  private func wirePipe(_ pipe: Pipe) {
    pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
      let data = handle.availableData
      guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
      for raw in text.split(whereSeparator: \.isNewline) {
        let line = String(raw)
        DispatchQueue.main.async { self?.receive(line) }
      }
    }
  }

  private func receive(_ line: String) {
    log(line)
    let range = NSRange(line.startIndex..<line.endIndex, in: line)
    if let match = urlPattern.firstMatch(in: line, range: range), match.numberOfRanges >= 2,
       let urlRange = Range(match.range(at: 1), in: line) {
      url = URL(string: String(line[urlRange]))
    }
  }

  private func tick() {
    if reopenTouched() { openIsland() }
    guard !ready else { return }
    if url != nil { checkReadyAsync() }
    if !ready && Date().timeIntervalSince(startedAt) > 90 {
      fail("启动时间过长，请退出后重试。详情见日志目录。")
    }
  }

  private func reopenTouched() -> Bool {
    let path = home.appendingPathComponent(smoke ? "launcher-smoke.reopen" : "launcher.reopen").path
    guard let attrs = try? FileManager.default.attributesOfItem(atPath: path),
          let size = attrs[.size] as? NSNumber, size.intValue > 0 else { return false }
    try? "".write(toFile: path, atomically: true, encoding: .utf8)
    return true
  }

  private func checkReadyAsync() {
    guard let authURL = url, !checking else { return }
    checking = true
    let session = URLSession(configuration: .ephemeral)
    var authReq = URLRequest(url: authURL, timeoutInterval: 1.5)
    authReq.httpShouldHandleCookies = true
    session.dataTask(with: authReq) { [weak self] _, response, _ in
      guard let self else { return }
      let code = (response as? HTTPURLResponse)?.statusCode ?? 0
      // Windows expects HTTP 303 SeeOther on the auth URL before probing pages.
      guard code == 303 || code == 302 || code == 301 || code == 200 else {
        DispatchQueue.main.async { self.checking = false }
        return
      }
      let routes = ["/", "/world/"]
      let group = DispatchGroup()
      var pagesOK = true
      for route in routes {
        guard let pageURL = URL(string: route, relativeTo: authURL)?.absoluteURL else {
          pagesOK = false
          continue
        }
        group.enter()
        session.dataTask(with: URLRequest(url: pageURL, timeoutInterval: 3)) { _, response, _ in
          defer { group.leave() }
          if (response as? HTTPURLResponse)?.statusCode != 200 { pagesOK = false }
        }.resume()
      }
      group.notify(queue: .main) {
        self.checking = false
        if pagesOK { self.markReady() }
      }
    }.resume()
  }

  private func markReady() {
    guard !ready else { return }
    ready = true
    if smoke {
      try? "authenticated service ready".write(
        to: home.appendingPathComponent("smoke-ok.txt"),
        atomically: true,
        encoding: .utf8
      )
      if !holdSmoke { quitApp() }
      return
    }
    openIsland()
    statusWindow?.orderOut(nil)
  }

  @objc private func openIsland() {
    if smoke { return }
    guard let url else {
      statusWindow?.makeKeyAndOrderFront(nil)
      statusLabel?.stringValue = "正在准备小岛…"
      return
    }
    NSWorkspace.shared.open(url)
  }

  @objc private func openLogs() {
    NSWorkspace.shared.open(home)
  }

  @objc private func quitApp() {
    quitting = true
    stopServiceTree()
    NSApp.terminate(nil)
  }

  private func childPIDs(of pid: Int32) -> [Int32] {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/bin/ps")
    task.arguments = ["-axo", "pid=,ppid="]
    let pipe = Pipe()
    task.standardOutput = pipe
    try? task.run()
    task.waitUntilExit()
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    guard let text = String(data: data, encoding: .utf8) else { return [] }
    var children: [Int32] = []
    for line in text.split(whereSeparator: \.isNewline) {
      let parts = line.split(whereSeparator: \.isWhitespace).compactMap { Int32($0) }
      if parts.count == 2, parts[1] == pid { children.append(parts[0]) }
    }
    return children
  }

  private func stopServiceTree() {
    guard let service else { return }
    let rootPid = processIdentifierSafe(service)
    var stack = [rootPid]
    var all = [Int32]()
    while let pid = stack.popLast() {
      guard pid > 0 else { continue }
      all.append(pid)
      stack.append(contentsOf: childPIDs(of: pid))
    }
    if servicePGID > 0 {
      kill(-servicePGID, SIGTERM)
    }
    for pid in all.reversed() {
      kill(pid, SIGTERM)
    }
    let deadline = Date().addingTimeInterval(5)
    while service.isRunning && Date() < deadline {
      Thread.sleep(forTimeInterval: 0.05)
    }
    if service.isRunning || portStillListening() {
      if servicePGID > 0 { kill(-servicePGID, SIGKILL) }
      for pid in all.reversed() { kill(pid, SIGKILL) }
    }
    stdoutClear()
  }

  private func processIdentifierSafe(_ process: Process) -> Int32 {
    process.processIdentifier
  }

  private func portStillListening() -> Bool {
    guard let url, let port = url.port else { return false }
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
    task.arguments = ["-nP", "-iTCP:\(port)", "-sTCP:LISTEN"]
    task.standardOutput = Pipe()
    task.standardError = Pipe()
    try? task.run()
    task.waitUntilExit()
    return task.terminationStatus == 0
  }

  private func stdoutClear() {
    if let out = service?.standardOutput as? Pipe {
      out.fileHandleForReading.readabilityHandler = nil
    }
    if let err = service?.standardError as? Pipe {
      err.fileHandleForReading.readabilityHandler = nil
    }
  }

  private func fail(_ message: String) {
    log(message)
    if smoke {
      quitApp()
      return
    }
    statusLabel?.stringValue = message
    statusWindow?.makeKeyAndOrderFront(nil)
  }

  func windowShouldClose(_ sender: NSWindow) -> Bool {
    if quitting || url == nil { return true }
    sender.orderOut(nil)
    return false
  }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
