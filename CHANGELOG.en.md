# Changelog

[简体中文](CHANGELOG.md) · **English**

This file records user-facing changes to QCode. Until the project establishes a stable versioning policy, unreleased changes are listed under `Unreleased`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- Portable macOS Intel (x86_64) preview with a menu-bar launcher, bundled Node/DSH/world assets, `yarn build:desktop:darwin`, and `verify:desktop:darwin`.
- Portable macOS Apple Silicon (arm64) preview reusing the menu-bar launcher, bundling native arm64 Node and dependencies, and verifying packaged architecture, service readiness, single-instance behavior, and shutdown cleanup.

### Known limitations

- The macOS previews are unsigned and provide neither an installer nor automatic updates. Intel and Apple Silicon use separate architecture-specific archives; there is no Universal build.

## 0.1.0-preview.2 - 2026-09-18

A Windows 10/11 x64 portable preview under the QCode brand. macOS builds have not been published.

### Added

- World export freshness checks detect mismatches between Godot inputs and exported assets before development startup and desktop packaging.
- Resident conversation portraits, community and demo entry points, and broader Web, world, and desktop regression checks.

### Changed

- The product, repository, Web plugin, world protocol, and Windows launcher are now named QCode. Mosslight remains the name of the world.
- The new executable is `QCode.exe`, with data in `%LOCALAPPDATA%\QCode\data`. On first launch, old data is migrated when the new directory does not exist. Legacy routes, messages, and tutorial storage identity remain readable for compatibility.

### Known limitations

- Only the Windows portable ZIP is published. The installer has not completed manual installation, upgrade, and uninstall acceptance testing, and no macOS download is provided.
- The preview is unsigned and has no automatic updates. Users must configure a model and install project tools such as Git and Python themselves.
- Real-model tasks, a clean Windows system, long installation paths, and full browser interaction remain unverified. If both old and new data directories exist, they must be resolved manually.

## 0.1.0-preview.1 - 2026-09-15

The first portable preview for Windows 10/11 x64. This release provides a ZIP archive, not an installer.

### Added

- An explorable island, the Q coding entry point, project file and conversation history management, and guided/free creation entry points.
- Native DeepSeek Harness conversations, tool execution, and approvals, with the runtime and world assets bundled.
- Chinese/English switching across the Web interface and world, task state feedback, and recall to the central computer.
- Public contribution infrastructure: Issue forms, a pull request template, contributing guide, security policy, Code of Conduct, support guide, and CI.
- The MIT License for agent-isles-owned code, with Qiuner as copyright holder, plus an index of third-party licenses.

### Known limitations

- The preview is unsigned and has no automatic updater. macOS was not supported by this release.
- Users must configure their own model and install project tools such as Git and Python themselves.
- "Portable" means extract and run; user data is still stored in `%LOCALAPPDATA%\agent-isles\data`.
- The complete real-model workflow, long paths, and a clean Windows environment had not yet completed acceptance testing.
