# WSL Windows Fusion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge useful WSL project changes into the Windows Mercury repository while keeping Windows as the stable mainline and proving all core functionality works on Windows.

**Architecture:** Treat `D:\project\Mercury` as the integration target and `\\wsl.localhost\Ubuntu-24.04\home\yinch\Projects\Mercury` as a patch source. Update the Windows branch to the remote mainline first, then import WSL deltas by subsystem with Windows packaging/module-D/upstream fixes preserved. Verify each risky subsystem before moving on and finish with Windows build, automated tests, Electron launch, and full functional acceptance.

**Tech Stack:** Electron, Vue 3, TypeScript, Vite, SQLite via `better-sqlite3`, `rss-parser`, `fast-xml-parser`, `sanitize-html`, `turndown`, OpenAI-compatible SDK, `@mozilla/readability`, `jsdom`.

---

## File structure and responsibilities

### Existing files expected to be modified

- `package.json` — merge WSL verification scripts and dependencies while preserving Windows packaging configuration and Electron/native-module compatibility.
- `package-lock.json` — regenerate from the final `package.json` using Windows npm.
- `README.md` — merge only current, user-facing setup or verification notes from WSL; preserve Windows packaging/release notes that remain accurate.
- `dev.sh` — keep only cross-platform-safe or documented development script updates; do not depend on WSL-only behavior for Windows verification.
- `src/main/database/init.ts` — merge schema additions required by AI, tags, settings, content cleaning, and repository methods.
- `src/main/database/repository.ts` — preserve Windows module-D repository behavior and add WSL AI/summary/translation/content behavior when missing.
- `src/main/index.ts` — preserve Windows module-D IPC handlers and add WSL summary/translation/cleaning handlers without replacing Windows window/packaging assumptions blindly.
- `src/main/llm/agents.ts` — merge WSL agent behavior that supports summary and translation.
- `src/main/llm/config.ts` — merge WSL config helpers if they do not reintroduce local secrets.
- `src/main/services/ArticleService.ts` — preserve Windows cleaning integration and import WSL content-fetch or behavior fixes that are still missing.
- `src/main/services/SummaryService.ts` — merge WSL summary service improvements with Windows-compatible settings loading.
- `src/main/services/interfaces.ts` — add any missing interfaces needed by imported services.
- `src/preload/index.ts` and `src/preload/index.js` — expose final IPC API used by renderer and tests.
- `src/renderer/App.vue` — merge UI wiring for summary/translation/cleaning without removing current tag/export/settings flows.
- `src/renderer/components/SettingsView.vue` — preserve module-D settings UI and merge WSL LLM config behavior where newer.
- `src/renderer/env.d.ts` — align `window.electronAPI` types with final preload API.
- `tsconfig.main.json` — include WSL type declarations only if required for the final TypeScript build.

### Existing files to verify before editing

- `src/main/services/CleaningService.ts` — exists in Windows and WSL; compare before copying any WSL version.
- `src/main/services/ExportService.ts` — exists in Windows and WSL; preserve Windows module-D export behavior unless WSL has a clear fix.
- `src/main/services/SettingsService.ts` — exists in Windows and WSL; preserve persisted LLM config behavior.
- `src/main/services/TagService.ts` — exists in Windows and WSL; preserve Windows module-D tag API.
- `src/renderer/components/TagDialog.vue` — already exists in Windows; compare before copying.

### New files likely to import from WSL if missing or still useful

- `src/main/cleaners/cleaner.ts` — content-cleaning helper if Windows lacks the WSL version after remote sync.
- `src/main/services/TranslationService.ts` — translation service if Windows lacks it.
- `src/main/types/vendor.d.ts` — vendor typings required by final TypeScript build.
- `test/electron-window-smoke.cjs` — Windows-adjusted Electron smoke test.
- `test/fullflow-live.cjs` — import only if it can run without secrets or is clearly documented as optional/manual.
- `test/module-b-cleaning-verification.cjs` — module-B cleaning verification test.
- `test/services-regression.cjs` — service regression test.

### Files and paths to skip

- `.claude/hook-log.txt`
- `.claude/design-context.json`
- `.codex`
- `node_modules/**`
- `dist/**`, `release/**`, caches, runtime data
- any local config containing API keys or secrets

---

### Task 1: Preflight and protect the Windows baseline

**Files:**
- Read only: repository status and WSL status
- Modify: none

- [ ] **Step 1: Confirm Windows status is safe**

Run:

```bash
git status --short --branch
```

Expected: output may show the plan document as untracked or committed, but no unrelated user work. If unrelated changes are present, stop and ask the user before continuing.

- [ ] **Step 2: Confirm WSL status without changing Windows Git config**

Run:

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'cd /home/yinch/Projects/Mercury && git status --short --branch'
```

Expected: WSL status lists modified and untracked files. Do not run `git config --global --add safe.directory` on Windows.

- [ ] **Step 3: Capture the WSL import inventory**

Run:

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'cd /home/yinch/Projects/Mercury && git diff --name-status && printf "\nUNTRACKED\n" && git ls-files --others --exclude-standard'
```

Expected: inventory includes modified source files and untracked tests/services; skip `.claude`, `.codex`, and WSL-only local artifacts.

- [ ] **Step 4: Commit checkpoint only if plan file is still uncommitted**

Run:

```bash
git status --short docs/superpowers/plans/2026-06-10-wsl-windows-fusion.md
```

Expected: if this plan is untracked, commit it before implementation:

```bash
git add docs/superpowers/plans/2026-06-10-wsl-windows-fusion.md
git commit -m "$(cat <<'EOF'
docs: add WSL Windows fusion implementation plan

Provide a task-by-task integration plan before importing WSL changes into the Windows repository.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Sync the Windows target with remote main

**Files:**
- Modify: whatever upstream `origin/main` changes bring in
- Verify: `package.json`, `src/main/index.ts`, module-B reader/cleaning files

- [ ] **Step 1: Fetch remote refs**

Run:

```bash
git fetch origin
```

Expected: command succeeds.

- [ ] **Step 2: Inspect divergence**

Run:

```bash
git status --short --branch
git log --oneline --decorate --left-right HEAD...origin/main
```

Expected: local branch is ahead by local spec/plan commits and behind by remote commits.

- [ ] **Step 3: Merge remote main non-destructively**

Run:

```bash
git merge origin/main
```

Expected: merge succeeds or reports conflicts. If conflicts occur, resolve by preserving upstream module-B fixes and local docs under `docs/superpowers/**`.

- [ ] **Step 4: Verify the merge state**

Run:

```bash
git status --short --branch
```

Expected: no unmerged paths. If conflicts were resolved, commit the merge normally with Git's generated merge commit message.

---

### Task 3: Merge dependency metadata and regenerate lockfile

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Edit `package.json` scripts**

Add these WSL verification scripts if missing, while preserving Windows packaging scripts (`pack`, `dist`, `dist:win`, `dist:mac`, `dist:linux`) and existing `start` / `dev:electron` scripts:

```json
{
  "test:services": "npm run build:main && node test/services-regression.cjs",
  "verify:module-b": "npm run build:main && node test/module-b-cleaning-verification.cjs"
}
```

Do not add `dev:all` or `dev:xvfb` as required Windows workflows unless the scripts are made Windows-safe.

- [ ] **Step 2: Edit `package.json` dependencies**

Ensure these dependencies exist:

```json
{
  "@mozilla/readability": "^0.6.0",
  "jsdom": "^29.1.1",
  "fast-xml-parser": "^5.8.0",
  "lucide-vue-next": "^0.460.0",
  "node-fetch": "^3.3.2",
  "openai": "^4.0.0",
  "rss-parser": "^3.13.0",
  "sanitize-html": "^2.17.4",
  "turndown": "^7.2.4"
}
```

Keep `better-sqlite3` if Windows still uses SQLite natively. Do not downgrade Electron or remove `electron-builder` packaging metadata.

- [ ] **Step 3: Edit `package.json` devDependencies**

Ensure this type package exists if imported tests or cleaner typings require it:

```json
{
  "@types/jsdom": "^28.0.3"
}
```

Keep `@electron/rebuild`, `@types/better-sqlite3`, `electron-builder`, and Windows-compatible Electron settings from the current Windows project unless later build output proves a version mismatch.

- [ ] **Step 4: Regenerate lockfile on Windows**

Run:

```bash
npm install
```

Expected: `package-lock.json` updates successfully and no install failure occurs.

- [ ] **Step 5: Commit dependency metadata**

Run:

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
build: merge WSL verification dependencies

Add the runtime and test dependencies needed by the imported WSL functionality while preserving Windows packaging support.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Merge database schema and repository behavior

**Files:**
- Modify: `src/main/database/init.ts`
- Modify: `src/main/database/repository.ts`
- Test: `test/services-regression.cjs` after imported in a later task

- [ ] **Step 1: Compare schema definitions**

Run:

```bash
git diff --no-index -- src/main/database/init.ts "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/src/main/database/init.ts"
```

Expected: diff shows WSL schema additions or column/default differences. Use it only as a guide.

- [ ] **Step 2: Update `src/main/database/init.ts`**

Ensure the final schema includes tables and columns required by current Windows modules and WSL AI flows:

```sql
feeds(id, title, feed_title, custom_title, url, description, site_url, favicon_url, refresh_interval_minutes, last_refreshed_at, last_error, created_at, updated_at)
entries(id, feed_id, title, url, author, published_at, guid, excerpt, is_read, created_at)
entry_contents(entry_id, raw_html, cleaned_html, cleaned_markdown, fetched_at)
tags(id, name, created_at)
entry_tags(entry_id, tag_id, created_at)
settings(key, value, updated_at)
agent_runs(id, entry_id, agent_type, input_text, output_text, status, error_message, started_at, completed_at)
llm_usage(id, agent_run_id, model, prompt_tokens, completion_tokens, total_tokens, created_at)
```

Keep existing migration/`ALTER TABLE` guards so existing local databases do not crash when columns already exist.

- [ ] **Step 3: Merge repository methods**

Update `src/main/database/repository.ts` so it supports all of these public methods after merge:

```ts
getAllFeeds(): Feed[]
getArticleCountByFeed(feedId: string): number
upsertEntry(entry: EntryRecord): { id: string; inserted: boolean }
getArticlesByFeed(feedId: string): Article[]
getAllArticles(): Article[]
getUnreadArticles(): Article[]
getArticleContent(entryId: string): ArticleContent | undefined
upsertEntryContent(content: EntryContentRecord): void
markAsRead(entryId: string): void
markAsUnread(entryId: string): void
getArticleTags(entryId: string): Tag[]
getAllTags(): Tag[]
createTag(tag: { id: string; name: string; createdAt: number }): Tag
deleteTag(tagId: string): void
getTagByName(name: string): Tag | undefined
addTagToArticle(entryId: string, tagId: string, createdAt: number): void
removeTagFromArticle(entryId: string, tagId: string): void
getArticlesByTag(tagName: string): Article[]
getSetting(key: string): string | null
saveSetting(key: string, value: string, updatedAt?: number): void
getLLMConfig(): LLMConfig
saveLLMConfig(config: LLMConfig): void
createAgentRun(run: { id: string; entryId: string; agentType: 'summary' | 'translation'; inputText: string; outputText: string; status: string; errorMessage?: string | null; startedAt: number; completedAt?: number | null }): void
createLLMUsage(usage: { id: string; agentRunId: string; model: string; promptTokens?: number | null; completionTokens?: number | null; totalTokens?: number | null; createdAt: number }): void
```

Preserve Windows tag/export repository behavior and import WSL `getLatestAgentOutput()` behavior so `ArticleContent.summary` and `ArticleContent.translation` are populated from completed `agent_runs`.

- [ ] **Step 4: Build the main process**

Run:

```bash
npm run build:main
```

Expected: TypeScript build succeeds or reports missing methods/types directly related to the merge. Fix those before continuing.

- [ ] **Step 5: Commit database and repository merge**

Run:

```bash
git add src/main/database/init.ts src/main/database/repository.ts
git commit -m "$(cat <<'EOF'
feat: merge repository support for AI and content data

Extend the Windows database layer with WSL content and AI result storage while preserving tag, settings, and export behavior.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Merge cleaning, summary, translation, and LLM services

**Files:**
- Create or modify: `src/main/cleaners/cleaner.ts`
- Modify: `src/main/services/CleaningService.ts`
- Modify: `src/main/services/ArticleService.ts`
- Modify: `src/main/services/SummaryService.ts`
- Create: `src/main/services/TranslationService.ts` if missing
- Modify: `src/main/services/interfaces.ts`
- Modify: `src/main/llm/agents.ts`
- Modify: `src/main/llm/config.ts`
- Create: `src/main/types/vendor.d.ts` if TypeScript needs vendor declarations

- [ ] **Step 1: Import cleaner helper if needed**

If `src/main/cleaners/cleaner.ts` does not exist after remote sync, copy the WSL file:

```bash
mkdir -p src/main/cleaners
cp "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/src/main/cleaners/cleaner.ts" src/main/cleaners/cleaner.ts
```

Expected: file exists and imports only project dependencies declared in `package.json`.

- [ ] **Step 2: Compare service files before copying**

Run:

```bash
git diff --no-index -- src/main/services/SummaryService.ts "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/src/main/services/SummaryService.ts"
git diff --no-index -- src/main/llm/agents.ts "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/src/main/llm/agents.ts"
git diff --no-index -- src/main/services/ArticleService.ts "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/src/main/services/ArticleService.ts"
```

Expected: use diffs to identify WSL-only behavior. Do not replace Windows files wholesale if they contain newer upstream fixes.

- [ ] **Step 3: Ensure summary and translation services have a settings provider**

Final service construction must work with this shape from `src/main/index.ts`:

```ts
summaryService = new SummaryService(repository, () => getSettingsService().getLLMConfig())
translationService = new TranslationService(repository, () => getSettingsService().getLLMConfig())
```

If the current constructor signatures differ, adapt the services to accept `Repository` and `() => LLMConfig` rather than reading local secret files.

- [ ] **Step 4: Ensure services persist AI output**

`SummaryService.summarize(articleId)` and `TranslationService.translate(articleId, targetLang)` must call repository methods equivalent to:

```ts
repository.createAgentRun({
  id: crypto.randomUUID(),
  entryId: articleId,
  agentType: 'summary',
  inputText,
  outputText,
  status: 'completed',
  startedAt,
  completedAt: Date.now()
})
```

Translation must use `agentType: 'translation'`.

- [ ] **Step 5: Align interfaces**

Update `src/main/services/interfaces.ts` so it declares the imported service contracts used by implementation and tests, including cleaning, summary, translation, tags, export, and settings interfaces.

- [ ] **Step 6: Add vendor typings only if required**

If `npm run build:main` reports missing declarations for `@mozilla/readability` or `jsdom`, copy or create `src/main/types/vendor.d.ts` with declarations matching the packages actually imported. Do not add broad `any` declarations unless package types are unavailable.

- [ ] **Step 7: Build the main process**

Run:

```bash
npm run build:main
```

Expected: main process TypeScript build succeeds.

- [ ] **Step 8: Commit service merge**

Run:

```bash
git add src/main/cleaners src/main/services src/main/llm src/main/types/vendor.d.ts tsconfig.main.json
git commit -m "$(cat <<'EOF'
feat: merge WSL AI and cleaning services

Wire summary, translation, and content cleaning into the Windows service layer without reintroducing local secret configuration.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Merge main-process IPC and preload API

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.js`
- Modify: `src/renderer/env.d.ts`

- [ ] **Step 1: Merge `src/main/index.ts` handlers**

Preserve Windows module-D handlers:

```ts
'get-all-tags'
'create-tag'
'delete-tag'
'add-tag-to-article'
'remove-tag-from-article'
'get-article-tags'
'get-articles-by-tag'
'select-markdown-export-path'
'export-markdown'
'export-markdown-batch'
'get-llm-config'
'save-llm-config'
'get-setting'
'save-setting'
```

Add WSL handlers if missing:

```ts
'clean-article'
'summarize-article'
'translate-article'
```

Expected: there is only one handler per IPC channel.

- [ ] **Step 2: Merge service initialization**

Final `initializeServices()` should instantiate all needed services once:

```ts
const database = initDatabase()
const repository = new Repository(database)
const cleaningServiceInstance = new CleaningService(repository)
feedService = new FeedService(repository)
articleService = new ArticleService(repository, cleaningServiceInstance)
tagService = new TagService(repository)
exportService = new ExportService(repository, articleService)
settingsService = new SettingsService(repository)
summaryService = new SummaryService(repository, () => getSettingsService().getLLMConfig())
translationService = new TranslationService(repository, () => getSettingsService().getLLMConfig())
```

Use variable names that do not shadow module-level getters unexpectedly.

- [ ] **Step 3: Add getters for new services**

Add `getCleaningService()`, `getSummaryService()`, and `getTranslationService()` with the same initialized-service guard pattern already used by other services.

- [ ] **Step 4: Merge preload methods**

Expose methods in `src/preload/index.ts` and compiled `src/preload/index.js` for every final IPC channel. The renderer API must include at least:

```ts
cleanArticle(articleId: string)
summarizeArticle(articleId: string)
translateArticle(articleId: string, targetLang: string)
getAllTags()
createTag(name: string)
deleteTag(tagId: string)
addTagToArticle(articleId: string, tagName: string)
removeTagFromArticle(articleId: string, tagName: string)
getArticleTags(articleId: string)
getArticlesByTag(tagName: string)
selectMarkdownExportPath(defaultFilename: string)
exportMarkdown(articleId: string, filePath: string)
exportMarkdownBatch(articleIds: string[], dirPath: string)
getLLMConfig()
saveLLMConfig(config: LLMConfig)
getSetting(key: string)
saveSetting(key: string, value: string)
```

- [ ] **Step 5: Align renderer environment types**

Update `src/renderer/env.d.ts` so `window.electronAPI` matches the final preload API exactly. Use existing project types from `src/main/types` when possible.

- [ ] **Step 6: Build the main process**

Run:

```bash
npm run build:main
```

Expected: build succeeds and `src/preload/index.js` remains in sync with `src/preload/index.ts` if this project tracks both.

- [ ] **Step 7: Commit IPC and preload merge**

Run:

```bash
git add src/main/index.ts src/preload/index.ts src/preload/index.js src/renderer/env.d.ts
git commit -m "$(cat <<'EOF'
feat: expose merged IPC API

Add WSL cleaning and AI IPC channels while preserving Windows tag, export, and settings APIs.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Merge renderer UI wiring

**Files:**
- Modify: `src/renderer/App.vue`
- Modify: `src/renderer/components/SettingsView.vue`
- Verify: `src/renderer/components/TagDialog.vue`

- [ ] **Step 1: Compare renderer files**

Run:

```bash
git diff --no-index -- src/renderer/App.vue "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/src/renderer/App.vue"
git diff --no-index -- src/renderer/components/SettingsView.vue "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/src/renderer/components/SettingsView.vue"
```

Expected: identify WSL UI wiring for cleaning, summary, translation, and settings without removing Windows tag/export UI.

- [ ] **Step 2: Preserve module-D UI**

Confirm `App.vue` still imports and uses tag/export/settings flows that depend on these API calls:

```ts
getAllTags
createTag
deleteTag
addTagToArticle
removeTagFromArticle
getArticleTags
getArticlesByTag
selectMarkdownExportPath
exportMarkdown
exportMarkdownBatch
```

Expected: no module-D UI regression.

- [ ] **Step 3: Add WSL article actions**

Merge WSL UI calls for:

```ts
cleanArticle(selectedArticle.id)
summarizeArticle(selectedArticle.id)
translateArticle(selectedArticle.id, targetLanguage)
```

Expected: UI handles loading and error state without assuming a configured API key.

- [ ] **Step 4: Merge LLM settings behavior**

Ensure `SettingsView.vue` loads and saves this shape:

```ts
{
  baseUrl: string,
  apiKey: string,
  model: string
}
```

Expected: save uses `window.electronAPI.saveLLMConfig(config)` and reload uses `window.electronAPI.getLLMConfig()`.

- [ ] **Step 5: Build renderer and main**

Run:

```bash
npm run build
```

Expected: Vite and TypeScript builds succeed.

- [ ] **Step 6: Commit renderer merge**

Run:

```bash
git add src/renderer/App.vue src/renderer/components/SettingsView.vue src/renderer/components/TagDialog.vue
git commit -m "$(cat <<'EOF'
feat: merge renderer wiring for AI and settings

Expose imported WSL reading and AI actions in the Windows UI while preserving tag, export, and settings flows.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Import and adapt regression tests

**Files:**
- Create or modify: `test/services-regression.cjs`
- Create or modify: `test/module-b-cleaning-verification.cjs`
- Create or modify: `test/electron-window-smoke.cjs`
- Optional manual-only: `test/fullflow-live.cjs`

- [ ] **Step 1: Copy non-secret tests from WSL**

Run:

```bash
cp "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/test/services-regression.cjs" test/services-regression.cjs
cp "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/test/module-b-cleaning-verification.cjs" test/module-b-cleaning-verification.cjs
cp "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/test/electron-window-smoke.cjs" test/electron-window-smoke.cjs
```

Expected: files copied. Inspect before committing.

- [ ] **Step 2: Inspect tests for hardcoded WSL paths or secrets**

Run:

```bash
git diff -- test/services-regression.cjs test/module-b-cleaning-verification.cjs test/electron-window-smoke.cjs
```

Expected: no hardcoded `/home/yinch`, API keys, local config paths, or WSL-only assumptions. If present, edit tests to use project-relative paths and environment variables.

- [ ] **Step 3: Decide whether to import `fullflow-live.cjs`**

Read the WSL file:

```bash
node -e "const fs=require('fs'); const p='//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/test/fullflow-live.cjs'; console.log(fs.readFileSync(p,'utf8').slice(0,4000))"
```

Expected: if it requires live API credentials or network-only flows, do not make it part of automated `npm` scripts. Import it only as a manual test with clear environment requirements.

- [ ] **Step 4: Run service regression test**

Run:

```bash
npm run test:services
```

Expected: build succeeds and `test/services-regression.cjs` passes.

- [ ] **Step 5: Run module-B verification**

Run:

```bash
npm run verify:module-b
```

Expected: build succeeds and cleaning verification passes.

- [ ] **Step 6: Commit tests**

Run:

```bash
git add test/services-regression.cjs test/module-b-cleaning-verification.cjs test/electron-window-smoke.cjs test/fullflow-live.cjs package.json package-lock.json
git commit -m "$(cat <<'EOF'
test: import WSL regression checks

Bring the WSL service, cleaning, and Electron smoke checks into the Windows integration workflow.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Merge documentation and safe dev scripts

**Files:**
- Modify: `README.md`
- Modify: `dev.sh`
- Optional create/modify: docs that describe imported behavior

- [ ] **Step 1: Compare WSL docs and script changes**

Run:

```bash
git diff --no-index -- README.md "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/README.md"
git diff --no-index -- dev.sh "//wsl.localhost/Ubuntu-24.04/home/yinch/Projects/Mercury/dev.sh"
```

Expected: identify user-facing updates and WSL-only launcher changes.

- [ ] **Step 2: Update README**

Merge only accurate current instructions. README should mention Windows verification commands:

```bash
npm install
npm run build
npm run test:services
npm run verify:module-b
npm run dev
npm run dev:electron
```

Expected: README does not claim WSL-only commands are required for Windows.

- [ ] **Step 3: Update `dev.sh` only if useful**

If retaining `dev.sh`, keep it as a helper for Unix-like shells and do not make Windows acceptance depend on it. Windows acceptance should use npm scripts directly.

- [ ] **Step 4: Commit docs/scripts**

Run:

```bash
git add README.md dev.sh docs
git commit -m "$(cat <<'EOF'
docs: update merged Windows verification notes

Document the post-fusion development and verification flow without relying on WSL-only helpers.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Full Windows automated verification

**Files:**
- Modify only if verification reveals defects in already-merged files

- [ ] **Step 1: Run full build**

Run:

```bash
npm run build
```

Expected: renderer and main builds succeed.

- [ ] **Step 2: Run service regression**

Run:

```bash
npm run test:services
```

Expected: service regression passes.

- [ ] **Step 3: Run module-B verification**

Run:

```bash
npm run verify:module-b
```

Expected: content cleaning verification passes.

- [ ] **Step 4: Run Electron smoke test if it is headless-safe on Windows**

Run:

```bash
node test/electron-window-smoke.cjs
```

Expected: Electron opens and exits successfully. If the script requires a display or times out, document exact failure and use manual launch in Task 11.

- [ ] **Step 5: Rebuild native modules only if Electron reports ABI mismatch**

If launch or tests report `better-sqlite3` module version mismatch, run:

```bash
npx @electron/rebuild -v 38.8.6 -m node_modules/better-sqlite3
```

Expected: rebuild succeeds. If Electron version changed in `package.json`, replace `38.8.6` with the installed Electron version from `npm ls electron`.

- [ ] **Step 6: Commit verification fixes if needed**

If code changes were required to pass verification, run:

```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
fix: stabilize Windows fusion verification

Resolve issues found by the Windows build and regression checks after importing WSL functionality.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Full Windows functional acceptance

**Files:**
- Modify only if manual acceptance reveals defects

- [ ] **Step 1: Start Vite dev server**

Run in background:

```bash
npm run dev
```

Expected: Vite starts and prints a local URL such as `http://localhost:5173`.

- [ ] **Step 2: Launch Electron against Vite**

Run:

```bash
VITE_DEV_SERVER_URL="http://localhost:5173" npm run dev:electron
```

Expected: Mercury opens on Windows.

- [ ] **Step 3: Verify subscription and OPML flow**

Manual acceptance:

```text
- Add or edit a subscription.
- Import an OPML fixture from test/opml.
- Refresh feeds.
- Confirm duplicate articles are not created for the same feed items.
```

Expected: no app crash and UI updates correctly.

- [ ] **Step 4: Verify article reading and cleaning flow**

Manual acceptance:

```text
- Select an article.
- Open reader content.
- Trigger clean/read action if exposed.
- Confirm cleaned HTML or Markdown-backed rendering appears and empty/loading/error states are reasonable.
```

Expected: content path works without console errors that break the UI.

- [ ] **Step 5: Verify AI settings and missing-config behavior**

Manual acceptance:

```text
- Open Settings.
- Save baseUrl/apiKey/model values.
- Reload settings view and confirm values persist.
- Clear config or leave missing config, then trigger summary/translation.
```

Expected: missing config produces a visible, non-crashing error; saved config is loaded through SQLite settings.

- [ ] **Step 6: Verify summary and translation call path**

Manual acceptance:

```text
- With valid LLM config available, trigger summary for an article.
- Trigger translation for an article and target language.
- Reopen article content.
```

Expected: completed outputs are visible or stored and then returned through article content. If no valid API key is available, record this as not executed rather than faking success.

- [ ] **Step 7: Verify tags**

Manual acceptance:

```text
- Create a tag.
- Add it to an article.
- Remove it from an article.
- Filter or view articles/tags where the UI supports it.
```

Expected: tag counts and article tag display update.

- [ ] **Step 8: Verify Markdown export**

Manual acceptance:

```text
- Export one article to Markdown.
- Open the exported file.
- Confirm title, link/source URL, content, summary/translation when available, and tags when available are included.
```

Expected: exported Markdown exists and includes expected metadata.

- [ ] **Step 9: Verify packaging scripts still parse**

Run:

```bash
npm run pack
```

Expected: directory packaging completes or fails only for environment-specific packaging prerequisites. It must not fail because `package.json` build metadata was removed or malformed.

- [ ] **Step 10: Commit acceptance fixes if needed**

If manual testing required changes, run:

```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
fix: address Windows acceptance findings

Fix issues found during full Windows functional acceptance of the WSL fusion.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Final review and handoff

**Files:**
- Read only unless final fixes are required

- [ ] **Step 1: Review final diff against the pre-fusion base**

Run:

```bash
git status --short --branch
git log --oneline --decorate -12
```

Expected: working tree is clean except for intentional uncommitted acceptance notes if the user requested no commit.

- [ ] **Step 2: Confirm skipped WSL files were not imported**

Run:

```bash
git status --short --ignored | grep -E "(\.codex|hook-log|node_modules|config\.json)" || true
```

Expected: no skipped local artifacts staged or committed.

- [ ] **Step 3: Summarize verification evidence**

Prepare a final handoff with exact command outcomes:

```text
- npm run build: PASS/FAIL
- npm run test:services: PASS/FAIL
- npm run verify:module-b: PASS/FAIL
- node test/electron-window-smoke.cjs: PASS/FAIL/SKIPPED with reason
- Manual Electron launch: PASS/FAIL
- Functional acceptance checklist: PASS/FAIL/NOT EXECUTED with reason per item
```

Expected: no success claim is made without command or manual verification evidence.
