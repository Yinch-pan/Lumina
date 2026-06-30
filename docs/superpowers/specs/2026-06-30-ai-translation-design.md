# AI Translation Full-Article Segmentation Fix Design

## Goal

Fix the AI translation flow so full articles are translated segment by segment instead of collapsing some inputs into one segment that can lead to only the beginning being translated.

## Root cause

`TranslationService` currently builds translation segments with `markdown.split(/\n\n+/)`. This works only when cleaned Markdown contains blank lines between blocks. Real RSS/article content may have single-newline Markdown, list/title-heavy Markdown, or raw HTML fallback such as consecutive `<p>` tags. In those cases the service treats the whole article as one segment, sends one large request, and the model may return only the first paragraph or opening portion.

## Scope

- Cover both `cleanedMarkdown` and `rawHtml` inputs.
- Keep the existing IPC contract: `translate-article` returns final combined text and emits `translate-progress` per segment.
- Keep the existing ReaderView bilingual rendering behavior.
- Do not change LLM provider behavior or settings UI.

## Design

Add a focused segmentation helper in `TranslationService`:

1. Prefer `cleanedMarkdown` when present.
2. Split Markdown into block-like segments using blank lines first, then fall back to single-line block splitting when the blank-line result is one large block.
3. Preserve non-empty headings, paragraphs, list lines, and other Markdown blocks as translation units.
4. If Markdown is missing, parse `rawHtml` with `jsdom` and extract semantic block text from `p`, headings, list items, blockquotes, `pre`, and table cells.
5. If semantic extraction returns nothing, use the trimmed plain text fallback.

`translate()` then iterates those segments exactly as it does today: retry each segment up to three times, emit progress for each segment, combine source and translation pairs, and store the final output in `agent_runs`.

## Error handling

- Empty article content still throws the existing empty-content error.
- Individual segment failures keep the current behavior: the failed segment uses the source text as fallback, reports `status: failed`, and translation continues.
- HTML parsing failure falls back to plain text rather than failing the whole translation.

## Tests

Add regression coverage to `test/feature-translation.cjs`:

1. A cleaned Markdown article with single-newline paragraphs (`First para.\nSecond para.`) must emit two progress events and include both paragraphs in output.
2. A raw HTML-only article with multiple `<p>` blocks must emit multiple progress events and include each block in output.
3. Existing two-blank-line Markdown behavior and AI-content refresh behavior must keep passing.

## Verification

Run:

- `npm run build:main`
- `node test/feature-translation.cjs`
