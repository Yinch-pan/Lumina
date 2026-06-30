# AI Translation Segmentation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure AI translation processes full articles by splitting both Markdown and raw HTML fallback content into reliable translation segments.

**Architecture:** Keep the existing `TranslationService.translate()` flow and IPC contract unchanged. Add a small, local segmentation layer inside `TranslationService.ts` that turns `ArticleContent` into block-like strings before the existing retry/progress/storage loop runs.

**Tech Stack:** Electron main process, TypeScript, `jsdom`, Node test scripts, SQLite-backed repository tests.

---

## File Structure

- Modify `src/main/services/TranslationService.ts`: add segment-building helpers and use them in `translate()`.
- Modify `test/feature-translation.cjs`: add regression cases for single-newline Markdown and raw HTML-only multi-paragraph content.

No new runtime files are needed. The fix stays in the service because segmentation is only used by translation and should not change article loading or cleaning behavior globally.

---

### Task 1: Add failing segmentation regression tests

**Files:**
- Modify: `test/feature-translation.cjs`

- [ ] **Step 1: Add Markdown single-newline and raw HTML-only fixtures**

Insert these entries after the existing `e2` fixture in `test/feature-translation.cjs`:

```js
  repo.upsertEntry({
    id: 'e3', feedId: 'f1', title: 'Single newline Markdown', url: 'https://e.com/3', author: 'C',
    publishedAt: now, guid: 'g3', excerpt: 'single newline', isRead: false, createdAt: now
  })
  repo.upsertEntryContent({
    entryId: 'e3', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: 'First single-line paragraph.\nSecond single-line paragraph.', fetchedAt: now
  })

  repo.upsertEntry({
    id: 'e4', feedId: 'f1', title: 'Raw HTML Only', url: 'https://e.com/4', author: 'D',
    publishedAt: now, guid: 'g4', excerpt: 'html only', isRead: false, createdAt: now
  })
  repo.upsertEntryContent({
    entryId: 'e4', rawHtml: '<article><p>HTML paragraph one.</p><p>HTML paragraph two.</p></article>', cleanedHtml: null,
    cleanedMarkdown: null, fetchedAt: now
  })
```

- [ ] **Step 2: Add failing assertions for single-newline Markdown**

Insert this after the existing `e1` translation assertions:

```js
  const singleNewlineProgress = []
  const singleNewlineResult = await svc.translate('e3', '中文', (seg, total) => singleNewlineProgress.push({ seg, total }))
  assert.equal(singleNewlineProgress.length, 2)
  assert.equal(singleNewlineProgress[0].total, 2)
  assert.ok(singleNewlineResult.includes('First single-line paragraph.'))
  assert.ok(singleNewlineResult.includes('Second single-line paragraph.'))
```

- [ ] **Step 3: Add failing assertions for raw HTML-only segmentation**

Insert this after the single-newline assertions:

```js
  const htmlOnlyProgress = []
  const htmlOnlyResult = await svc.translate('e4', '中文', (seg, total) => htmlOnlyProgress.push({ seg, total }))
  assert.equal(htmlOnlyProgress.length, 2)
  assert.equal(htmlOnlyProgress[0].total, 2)
  assert.ok(htmlOnlyResult.includes('HTML paragraph one.'))
  assert.ok(htmlOnlyResult.includes('HTML paragraph two.'))
```

- [ ] **Step 4: Build main process code**

Run:

```bash
npm run build:main
```

Expected: TypeScript compilation succeeds.

- [ ] **Step 5: Run translation test and verify it fails before implementation**

Run:

```bash
node test/feature-translation.cjs
```

Expected: FAIL on `singleNewlineProgress.length` or `htmlOnlyProgress.length` because current segmentation treats those inputs as one segment.

---

### Task 2: Implement translation segment builder

**Files:**
- Modify: `src/main/services/TranslationService.ts`

- [ ] **Step 1: Import `JSDOM`**

Change the imports at the top of `src/main/services/TranslationService.ts` from:

```ts
import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'
```

to:

```ts
import { randomUUID } from 'crypto'
import { JSDOM } from 'jsdom'
import { Repository } from '../database/repository'
```

- [ ] **Step 2: Replace inline split with a helper call**

Replace this code in `translate()`:

```ts
    const markdown = content.cleanedMarkdown || content.rawHtml
    if (!markdown || !markdown.trim()) {
      throw new Error('文章内容为空，请先打开文章抓取正文')
    }

    const segments = markdown
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
```

with:

```ts
    const markdown = content.cleanedMarkdown || content.rawHtml
    if (!markdown || !markdown.trim()) {
      throw new Error('文章内容为空，请先打开文章抓取正文')
    }

    const segments = buildTranslationSegments(content)
```

- [ ] **Step 3: Add focused helper functions at the bottom of the file**

Append these functions after the `TranslationService` class in `src/main/services/TranslationService.ts`:

```ts
function buildTranslationSegments(content: { cleanedMarkdown?: string; rawHtml?: string }): string[] {
  const markdown = content.cleanedMarkdown?.trim()
  if (markdown) {
    const markdownSegments = splitMarkdownSegments(markdown)
    if (markdownSegments.length > 0) {
      return markdownSegments
    }
  }

  const rawHtml = content.rawHtml?.trim()
  if (rawHtml) {
    const htmlSegments = splitHtmlSegments(rawHtml)
    if (htmlSegments.length > 0) {
      return htmlSegments
    }
  }

  return []
}

function splitMarkdownSegments(markdown: string): string[] {
  const blankLineSegments = markdown
    .split(/\n\s*\n+/)
    .map(normalizeSegment)
    .filter(Boolean)

  if (blankLineSegments.length !== 1) {
    return blankLineSegments
  }

  const lineSegments = markdown
    .split(/\n+/)
    .map(normalizeSegment)
    .filter(Boolean)

  return lineSegments.length > 1 ? lineSegments : blankLineSegments
}

function splitHtmlSegments(html: string): string[] {
  try {
    const dom = new JSDOM(`<body>${html}</body>`)
    const document = dom.window.document
    const blockSelector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,td,th'
    const segments = Array.from(document.querySelectorAll(blockSelector))
      .map((node) => normalizeSegment(node.textContent ?? ''))
      .filter(Boolean)

    if (segments.length > 0) {
      return segments
    }

    return [normalizeSegment(document.body.textContent ?? '')].filter(Boolean)
  } catch {
    return [normalizeSegment(html.replace(/<[^>]+>/g, ' '))].filter(Boolean)
  }
}

function normalizeSegment(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
```

- [ ] **Step 4: Build main process code**

Run:

```bash
npm run build:main
```

Expected: TypeScript compilation succeeds.

- [ ] **Step 5: Run translation regression test**

Run:

```bash
node test/feature-translation.cjs
```

Expected: PASS and prints `Translation feature tests passed`.

---

### Task 3: Verify the focused fix against broader service behavior

**Files:**
- Verify: `src/main/services/TranslationService.ts`
- Verify: `test/feature-translation.cjs`

- [ ] **Step 1: Run the service regression suite**

Run:

```bash
npm run test:services
```

Expected: PASS. This command rebuilds the main process and runs the existing Electron-backed service regression script.

- [ ] **Step 2: Confirm no unintended files were changed by tests**

Run:

```bash
git status --short
```

Expected: only the intended source/test/spec/plan files should appear changed, plus any pre-existing user changes that were already present before this task. Do not delete or reset unrelated files.

- [ ] **Step 3: Review the diff for scope**

Run:

```bash
git diff -- src/main/services/TranslationService.ts test/feature-translation.cjs docs/superpowers/specs/2026-06-30-ai-translation-design.md docs/superpowers/plans/2026-06-30-ai-translation-segmentation-fix.md
```

Expected: diff shows only the segmentation helper, tests, and planning/spec documents.

- [ ] **Step 4: Do not commit unless explicitly requested**

This repository session has existing uncommitted user work. Leave changes uncommitted unless the user explicitly asks for a commit. If the user asks for a commit, stage only these files:

```bash
git add src/main/services/TranslationService.ts test/feature-translation.cjs docs/superpowers/specs/2026-06-30-ai-translation-design.md docs/superpowers/plans/2026-06-30-ai-translation-segmentation-fix.md
```

Then commit with a message that includes the required co-author trailer.

---

## Self-Review

- Spec coverage: Markdown single-newline segmentation is covered in Task 1 and Task 2. Raw HTML fallback segmentation is covered in Task 1 and Task 2. IPC, retry, progress, and storage behavior stay unchanged because `translate()` keeps the existing loop and only replaces segment construction.
- Placeholder scan: No TBD/TODO/fill-later steps remain. Each code change includes concrete snippets.
- Type consistency: `buildTranslationSegments()` accepts the existing `content` object shape and returns `string[]`, matching the existing `segments` loop in `TranslationService.translate()`.
