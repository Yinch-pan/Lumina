# WSL to Windows Fusion Design

## Goal

Merge the newer work from the WSL project at `\\wsl.localhost\Ubuntu-24.04\home\yinch\Projects\Mercury` into the Windows repository at `D:\project\Mercury`, while keeping the Windows repository as the stable mainline and proving the result works on Windows.

## Mainline and source of truth

The Windows repository remains the integration target. It already contains work that the WSL tree does not fully represent, including module D, packaging configuration, portable release documentation, and newer upstream module B fixes. The WSL project is treated as a patch source, not as a wholesale replacement.

Before integrating WSL changes, the Windows repository should be synced with `origin/main` so the target includes the latest remote commits. WSL changes are then reviewed and imported selectively.

## Scope

Include WSL changes that add or improve project functionality, tests, or scripts needed by the current Mercury app:

- Dependency and npm script changes that support Windows verification.
- Database schema and repository additions.
- Main process IPC and preload API additions.
- Service layer changes for article, cleaning, summary, translation, settings, tags, and export flows.
- Renderer changes needed to expose the merged functionality.
- Regression and smoke tests that can run from Windows.
- Documentation updates that describe current behavior.

Exclude local or environment-specific artifacts:

- `.claude/hook-log.txt` and other local Claude/session logs.
- `.codex` or unrelated tool state.
- `node_modules`, build output, caches, and generated runtime data.
- Secrets, local LLM config files, API keys, or machine-specific environment files.
- WSL-only launcher behavior unless it also improves Windows workflows.

## Integration phases

1. **Preflight**
   - Confirm the Windows working tree is clean.
   - Inspect WSL working tree status and WSL diff.
   - Avoid changing global Git configuration for WSL `safe.directory`; use WSL Git for read-only WSL history/status when needed.

2. **Sync Windows target**
   - Bring the Windows repository up to date with `origin/main` using a non-destructive merge or pull.
   - Resolve any conflicts by preserving the current Windows working tree and upstream stable behavior.

3. **Create an import inventory**
   - Compare tracked files, untracked WSL files, package metadata, and service/API changes.
   - Classify each item as import, skip, or manual merge.

4. **Apply changes by subsystem**
   - Dependencies and scripts.
   - Database and repository.
   - Main process IPC and preload API.
   - Services and LLM code.
   - Renderer UI and TypeScript environment definitions.
   - Tests and relevant docs.

5. **Verify incrementally**
   - Run focused build or type checks after risky subsystem merges.
   - Fix compile errors before continuing to the next subsystem.

6. **Full Windows acceptance**
   - Run `npm run build`.
   - Run existing and imported service/regression tests.
   - Rebuild native Electron modules if `better-sqlite3` or Electron versions require it.
   - Launch the Electron app on Windows.
   - Verify the full functional checklist.

## Conflict rules

When the same file differs between Windows and WSL:

- Prefer the latest Windows/upstream stable implementation as the base.
- Import only the WSL behavior that is clearly newer and still relevant.
- Preserve Windows packaging metadata and scripts unless WSL has a directly compatible improvement.
- Keep dependency versions compatible with Windows Electron runtime and native module rebuild requirements.
- Do not remove module D functionality, packaging support, release documentation, or module B fixes already present in Windows.

## Windows full-function acceptance checklist

The merged app should pass these checks on Windows:

- Build: renderer and main process compile successfully.
- Automated tests: existing tests and imported WSL regression tests pass or failures are documented with root cause.
- Electron launch: app opens successfully in Windows.
- Subscription and OPML: add/edit subscriptions, import OPML, refresh feeds, and avoid duplicate entries.
- Article reading: article list loads, content fetch/clean path works, reader states render correctly.
- AI features: LLM settings load/save, summary and translation call paths are wired and handle missing config gracefully.
- Tags: create tags, assign/remove tags, filter or display tags where supported.
- Export: export article content with available metadata to Markdown.
- Settings: settings page saves and reloads user-visible configuration.
- Packaging safety: packaging scripts/config remain valid after dependency and script merges.

## Risk controls

No destructive operation should be used as a shortcut. File deletes, dependency downgrades, wholesale overwrites, or changes that might discard Windows work require explicit confirmation. If WSL content includes secrets or local-only configuration, stop and ask before copying anything related to it.
