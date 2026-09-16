# Contributing to agent-isles

[简体中文](CONTRIBUTING.md) · **English**

Thank you for contributing to agent-isles. The project is still in early development. Search existing Issues before submitting one, and open an Issue to align on scope before beginning a large feature, interaction redesign, or architecture change.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.en.md). See [Support](SUPPORT.en.md) for general usage questions and the [Security Policy](SECURITY.en.md) for privately reporting vulnerabilities.

## Development environment

Full development and release verification currently use **Windows 10/11 x64** as the baseline. The complete macOS and Linux development workflows have not been verified. Documentation-only changes do not require the full toolchain.

| Tool | Required version or recommended baseline | Needed for |
| --- | --- | --- |
| Node.js | **24.x** recommended (Windows CI uses 24); the repository accepts `^22.19.0` or `>=24.0.0` | Web development, dependency installation, and packaging |
| Yarn | Pinned to **4.18.0**, invoked through Corepack | Installing and running workspace scripts |
| Corepack | No repository-pinned version; must support the Yarn version above | Package manager entry point |
| Git | No pinned version; a maintained Git for Windows 2.x with submodule support is recommended | Cloning, branches, and commits |
| Godot | **4.7.2 stable** with matching Web export templates | World development, the first complete source startup, and world exports |
| Blender | **5.2**, matching the existing world reconstruction instructions | Editing or regenerating models; not required when using the existing GLB files |
| Python | **3.x**, with no pinned minimum minor version | Font, image, and template tools, plus some native dependency builds |
| Inno Setup | **6.x** | Windows packaging; the aggregate build produces both EXE and ZIP artifacts |
| .NET Framework | **4.x**; build scripts use the system `v4.0.30319/csc.exe` | Compiling the Windows launcher |

The optional Python art tools use Pillow and fontTools, whose versions are not currently locked. Building native dependencies from source may also require the Visual Studio Build Tools C++ toolchain and Windows SDK. VS Code is optional; the repository does not require a particular editor version. Treat recommended versions as baselines, not as proof that every alternative has been verified.

Confirm that the core commands are available:

```powershell
git --version
node --version
corepack --version
corepack yarn --version
```

## Run from source

External contributors should fork the repository and clone their fork. The commands below clone the official repository as an example. For an existing clone, run `git submodule update --init --recursive` to fetch the pinned upstream source. Do not use `--remote` to move the submodule to the latest upstream revision.

```powershell
git clone --recurse-submodules https://github.com/Qiuner/agent-isles.git
cd agent-isles
corepack enable
corepack yarn install --immutable
corepack yarn check:upstream
corepack yarn check:vendored-runtime
```

The first complete startup requires a world export. Install Godot 4.7.2 and matching export templates, add `godot` to `PATH`, or set the executable path in the current PowerShell session:

```powershell
$env:GODOT_BIN = 'C:\Tools\Godot\Godot_v4.7.2-stable_win64_console.exe'
& $env:GODOT_BIN --version
corepack yarn build:world
corepack yarn dev:web --no-open
```

Continue only after each step succeeds. `dev:web` builds the Web plugins and starts the service, but it does not export the world. Open the local URL printed in the terminal and press Ctrl+C to stop the foreground service. Rebuild and restart after Web changes; re-export after world changes. Do not assume every part supports hot reload.

Development data is written to `.agent-isles-home/` inside the repository by default. Do not commit this directory or authenticated launch URLs. Real AI tasks require your own model configuration; interface work, documentation, and most automated tests do not require a model key. Tasks may modify files, so use a dedicated test project and inspect session permissions first.

If `corepack` is missing, follow the official Node.js/Corepack setup instructions. If `install --immutable` fails while building `fs-ext` or `node-gyp`, inspect the build log and confirm that Python and the C++ toolchain are available; skipping build scripts does not count as a successful installation. If Godot reports missing export templates, verify that both the engine and templates are version 4.7.2.

## Choose a contribution path

- Use the Bug Report form for reproducible defects, including environment details, steps, and sanitized logs.
- Discuss new capabilities or material workflow changes in a Feature Request before implementation.
- Small documentation, spelling, and test fixes may go directly to a pull request.
- Do not report security issues publicly. Check the repository Security page for its private reporting channel.

See [Support](SUPPORT.en.md), the [Security Policy](SECURITY.en.md), and the [Code of Conduct](CODE_OF_CONDUCT.en.md) for the respective policies.

## Code boundaries

- Product Web code lives in `packages/agent-isles-web/`; its startup profile lives in `apps/web/`.
- Windows and macOS Intel launchers and local preview packaging live in `apps/desktop/`.
- The Godot and Blender world lives in `games/mosslight/`.
- Do not modify the `deepseek-harness/` submodule directly.
- Do not manually edit tarballs or manifests in `vendor/dsh-runtime/`.
- Do not commit `.agent-isles-home/`, build output, temporary screenshots, editor caches, or personal configuration.

## Implementation and verification

Choose the relevant entry point for your change:

- Web/Host plugins: [plugin development guide](packages/agent-isles-web/docs/plugin-development.md).
- New islands and world interactions: [island integration contract](docs/world-integration-contract.md) and [world development guide](games/mosslight/README.md).
- Desktop launchers and distribution: [desktop guide](apps/desktop/README.en.md).
- Documentation: [documentation portal](docs/README.md) and [documentation maintenance guide](docs/documentation-guide.md).

Most detailed engineering documents are currently maintained in Chinese. Read the `AGENTS.md` that applies to your target directory before making changes. The GitHub Pages introduction site lives in `docs/index.html` and `docs/site.css`; it is separate from the runnable island application.

Keep changes focused and run the smallest relevant checks for the affected area:

```powershell
corepack yarn typecheck
corepack yarn build:web
corepack yarn build:world
corepack yarn check:upstream
corepack yarn check:vendored-runtime
git diff --check
```

You do not need to run every command for every change, but a pull request must accurately list what was run. Include desktop and relevant narrow-screen screenshots or recordings for interface changes. For interaction fixes, document the reproduction and the behavior after the fix.

For Web behavior changes, run the related tests. To run all Web tests:

```powershell
node --test (Get-ChildItem packages/agent-isles-web/tests/*.test.mjs | ForEach-Object FullName)
```

Run the relevant `tests/*.gd` scripts described by the world guide for Godot changes; a successful export alone is not interaction verification. Documentation-only changes need link/content review and `git diff --check`. When capability, acceptance status, or known limitations change, update `docs/construction-plan.md` and the relevant implementation document, keeping "implemented, pending acceptance" distinct from "accepted."

Public Chinese and English documents in the repository root and desktop guide are maintained as pairs. When either language changes, update the other in the same change. `corepack yarn check:doc-i18n` checks the current working tree, while GitHub CI checks the commit range for a pull request or push. This check only confirms that both files changed; reviewers must still verify that their meaning remains aligned.

## Commits and pull requests

Create a working branch from the latest default branch, push it to your fork, and open a pull request against this repository's `master` branch. Review your diff before staging only the intended files; exclude personal data and unrelated formatting.

Commit titles use Conventional Commits with a Chinese description and an English summary:

```text
fix(web): 避免帮助入口遮挡关闭按钮 / Prevent help trigger from covering close button
```

Keep each commit to one coherent change. Pull request descriptions must cover the related Issue, changes, verification evidence, interface changes, and remaining limitations. Maintainers may ask for large pull requests to be split or for additional regression tests.

By contributing, you confirm that you have the right to provide the content and agree to license the contribution under the repository's [MIT License](LICENSE). Third-party content remains subject to its original license; identify its source and license terms in the pull request.
