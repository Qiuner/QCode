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
