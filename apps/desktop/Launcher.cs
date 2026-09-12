using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

internal static class Launcher {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);
    [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [StructLayout(LayoutKind.Sequential)] struct Limits { public long ProcessTime, JobTime; public uint Flags; public UIntPtr Min, Max; public uint Active; public UIntPtr Affinity; public uint Priority, Scheduling; }
    [StructLayout(LayoutKind.Sequential)] struct Io { public ulong Read, Write, Other, ReadBytes, WriteBytes, OtherBytes; }
    [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits { public Limits Basic; public Io Io; public UIntPtr ProcessMemory, JobMemory, PeakProcess, PeakJob; }
    static IntPtr job;
    static Process service;
    static string url;
    static string home;
    static NotifyIcon tray;
    static Form window;
    static Label status;
    static bool quitting;
    static bool smoke;
    static bool holdSmoke;
    static DateTime started;
    static StreamWriter log;

    [STAThread] static int Main(string[] args) {
        smoke = Array.IndexOf(args, "--smoke-test") >= 0;
        holdSmoke = Array.IndexOf(args, "--smoke-hold") >= 0;
        home = Environment.GetEnvironmentVariable("AGENT_ISLES_DATA_HOME") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "agent-isles", "data");
        Directory.CreateDirectory(home);
        string identity = "Local\\agent-isles-" + WindowsIdentity.GetCurrent().User.Value + (smoke ? "-smoke" : "");
        bool first;
        using (var mutex = new Mutex(true, identity, out first))
        using (var reopen = new EventWaitHandle(false, EventResetMode.AutoReset, identity + "-open")) {
            if (!first) { reopen.Set(); return 0; }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            window = new Form { Text = "agent-isles", Width = 440, Height = 190, StartPosition = FormStartPosition.CenterScreen, MaximizeBox = false };
            window.Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            status = new Label { Text = "正在准备小岛…", Dock = DockStyle.Fill, Padding = new Padding(24), AutoSize = false };
            window.Controls.Add(status);
            var menu = new ContextMenuStrip();
            menu.Items.Add("打开小岛", null, (s, e) => Open());
            menu.Items.Add("打开日志目录", null, (s, e) => Process.Start(home));
            menu.Items.Add("退出 agent-isles", null, (s, e) => Quit());
            tray = new NotifyIcon { Icon = window.Icon, Text = "agent-isles", ContextMenuStrip = menu, Visible = !smoke };
            tray.DoubleClick += (s, e) => Open();
            window.FormClosing += (s, e) => { if (!quitting && url != null) { e.Cancel = true; window.Hide(); } };
            window.FormClosed += (s, e) => Quit();
            log = new StreamWriter(Path.Combine(home, "launcher.log"), true) { AutoFlush = true };
            try {
                // The Node bootstrap waits for stdin until it is assigned to this job.
                // The browser stays outside the job and is never killed when the app exits.
                job = CreateJobObject(IntPtr.Zero, null);
                var limits = new ExtendedLimits(); limits.Basic.Flags = 0x2000;
                int size = Marshal.SizeOf(limits); IntPtr ptr = Marshal.AllocHGlobal(size);
                try {
                    Marshal.StructureToPtr(limits, ptr, false);
                    if (!SetInformationJobObject(job, 9, ptr, (uint)size)) throw new Exception("无法管理后台服务进程，请重新打开应用。");
                } finally { Marshal.FreeHGlobal(ptr); }
                string root = AppDomain.CurrentDomain.BaseDirectory;
                var info = new ProcessStartInfo(Path.Combine(root, "runtime", "node.exe"), "apps/desktop/boot.mjs --no-open --host 127.0.0.1 --port 0") { WorkingDirectory = root, UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true, RedirectStandardInput = true };
                info.EnvironmentVariables["DSH_HOME"] = home;
                info.EnvironmentVariables["AGENT_ISLES_DESKTOP"] = "1";
                info.EnvironmentVariables["PATH"] = Path.Combine(root, "runtime") + ";" + Environment.GetEnvironmentVariable("PATH");
                service = new Process { StartInfo = info };
                service.OutputDataReceived += (s, e) => Receive(e.Data);
                service.ErrorDataReceived += (s, e) => Receive(e.Data);
                service.Start();
                if (!AssignProcessToJobObject(job, service.Handle)) { service.Kill(); throw new Exception("无法管理后台服务进程，请重新打开应用。"); }
                service.BeginOutputReadLine(); service.BeginErrorReadLine();
                service.StandardInput.WriteLine("start"); service.StandardInput.Flush(); started = DateTime.UtcNow;
                var timer = new System.Windows.Forms.Timer { Interval = 500 };
                timer.Tick += (s, e) => {
                    if (reopen.WaitOne(0)) Open();
                    if (service.HasExited) { timer.Stop(); Fail("小岛服务已停止。请退出后重新打开应用。详情见日志目录。"); return; }
                    if (url != null && !window.Tag.Equals(true)) {
                        try {
                            var cookies = new CookieContainer();
                            var request = (HttpWebRequest)WebRequest.Create(url); request.AllowAutoRedirect = false; request.Timeout = 1500; request.CookieContainer = cookies;
                            using (var response = (HttpWebResponse)request.GetResponse()) {
                                if (response.StatusCode != HttpStatusCode.SeeOther) return;
                            }
                            foreach (string route in new[] { "/", "/world/" }) {
                                var page = (HttpWebRequest)WebRequest.Create(new Uri(new Uri(url), route)); page.CookieContainer = cookies; page.Timeout = 3000;
                                using (var response = (HttpWebResponse)page.GetResponse()) { if (response.StatusCode != HttpStatusCode.OK) return; }
                            }
                            window.Tag = true;
                            if (smoke) { File.WriteAllText(Path.Combine(home, "smoke-ok.txt"), "authenticated service ready"); if (!holdSmoke) Quit(); return; }
                            Open(); window.Hide();
                        } catch (WebException) { }
                    }
                    if (!window.Tag.Equals(true) && (DateTime.UtcNow - started).TotalSeconds > 90) { timer.Stop(); Fail("启动时间过长，请退出后重试。详情见日志目录。"); }
                };
                window.Tag = false; timer.Start();
                if (smoke) window.Shown += (s, e) => window.Hide();
                Application.Run(window);
                timer.Dispose();
            } catch (Exception error) { Environment.ExitCode = 1; log.WriteLine(error.Message); if (!smoke) MessageBox.Show(error.Message, "小岛未能启动"); }
            finally { if (job != IntPtr.Zero) CloseHandle(job); if (service != null) { try { service.WaitForExit(5000); } catch (InvalidOperationException) { } service.Dispose(); } tray.Dispose(); log.Dispose(); }
        }
        return Environment.ExitCode;
    }
    static void Receive(string line) {
        if (line == null) return;
        var match = Regex.Match(line, @"^dsh web: (http://127\.0\.0\.1:\d+/\?token=[A-Za-z0-9_-]+)");
        if (match.Success) url = match.Groups[1].Value;
        lock (log) log.WriteLine(Regex.Replace(line, @"token=[A-Za-z0-9_-]+", "token=[redacted]"));
    }
    static void Open() {
        if (smoke) return;
        if (url == null) { window.Show(); window.Activate(); return; }
        try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
        catch { window.Show(); status.Text = "无法打开默认浏览器，请检查 Windows 默认浏览器设置后重试。"; }
    }
    static void Fail(string message) {
        log.WriteLine(message); Environment.ExitCode = 1;
        if (smoke) { Quit(); return; }
        status.Text = message; window.Show(); window.Activate();
    }
    static void Quit() { if (quitting) return; quitting = true; Application.Exit(); }
}
