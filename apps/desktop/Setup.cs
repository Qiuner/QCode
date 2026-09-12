using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;

internal static class Setup {
    [STAThread] static int Main(string[] args) {
        AppContext.SetSwitch("Switch.System.IO.UseLegacyPathHandling", false);
        AppContext.SetSwitch("Switch.System.IO.BlockLongPaths", false);
        Application.EnableVisualStyles();
        string target = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "agent-isles");
        bool extract = args.Length == 2 && args[0] == "--extract";
        if (extract) target = Path.GetFullPath(args[1]);
        if (!extract && MessageBox.Show("将为当前用户安装 agent-isles，无需管理员权限。\n\n安装位置：" + target, "安装 agent-isles", MessageBoxButtons.OKCancel) != DialogResult.OK) return 0;
        Form progress = null;
        try {
            if (Directory.Exists(target) && Directory.GetFileSystemEntries(target).Length != 0) throw new Exception("目标文件夹不为空。请先退出并卸载旧版本，个人数据会保留。");
            Directory.CreateDirectory(target);
            Label status = null;
            if (!extract) {
                progress = new Form { Text = "正在安装 agent-isles", Width = 430, Height = 150, ControlBox = false, StartPosition = FormStartPosition.CenterScreen };
                progress.Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                status = new Label { Dock = DockStyle.Fill, Padding = new Padding(20), Text = "正在解压运行时和小岛资源，请稍候…" };
                progress.Controls.Add(status); progress.Show(); Application.DoEvents();
            }
            using (var input = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
            using (var zip = new ZipArchive(input, ZipArchiveMode.Read)) {
                int count = 0;
                foreach (var entry in zip.Entries) {
                    string path = Path.GetFullPath(Path.Combine(target, entry.FullName));
                    if (!path.StartsWith(target.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new Exception("安装资源路径无效。");
                    string diskPath = @"\\?\" + path;
                    if (entry.Name == "") { Directory.CreateDirectory(diskPath); continue; }
                    Directory.CreateDirectory(Path.GetDirectoryName(diskPath));
                    using (var source = entry.Open()) using (var output = File.Create(diskPath)) source.CopyTo(output);
                    count++;
                    if (status != null && count % 100 == 0) { status.Text = "正在安装小岛… " + (count * 100 / zip.Entries.Count) + "%"; Application.DoEvents(); }
                }
            }
            if (extract) return 0;
            string executable = Path.Combine(target, "agent-isles.exe");
            dynamic shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            foreach (string folder in new[] { Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), Environment.GetFolderPath(Environment.SpecialFolder.Programs) }) {
                dynamic shortcut = shell.CreateShortcut(Path.Combine(folder, "agent-isles.lnk")); shortcut.TargetPath = executable; shortcut.WorkingDirectory = target; shortcut.Save();
            }
            using (var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\agent-isles")) {
                key.SetValue("DisplayName", "agent-isles"); key.SetValue("DisplayVersion", "0.0.0-preview"); key.SetValue("InstallLocation", target); key.SetValue("DisplayIcon", executable);
                key.SetValue("UninstallString", "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"" + Path.Combine(target, "uninstall.ps1") + "\"");
                key.SetValue("NoModify", 1); key.SetValue("NoRepair", 1);
            }
            if (progress != null) progress.Close();
            MessageBox.Show("安装完成。点击桌面上的 agent-isles 即可进入小岛。\n退出请使用通知区域中的 agent-isles 菜单。", "agent-isles");
            Process.Start(executable); return 0;
        } catch (Exception error) { File.WriteAllText(Path.Combine(Path.GetTempPath(), "agent-isles-setup-error.log"), error.ToString()); if (!extract) MessageBox.Show(error.Message, "安装未完成"); else Console.Error.WriteLine(error.Message); return 1; }
        finally { if (progress != null) progress.Dispose(); }
    }
}
