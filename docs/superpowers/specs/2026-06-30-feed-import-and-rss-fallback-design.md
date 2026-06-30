# Feed Import and RSS Fallback Design

## Context
Mercury currently treats feed import as a mostly synchronous pipeline: fetch RSS, parse items, create the feed, upsert entries, and then rely on later article opening to fetch and clean full article HTML. This causes two user-visible problems.

1. Large feeds such as `https://antirez.com/rss` feel slow to import because the user is waiting on a long end-to-end operation before the feed feels available.
2. Some imported articles, including antirez posts, can open with only a title and no readable body because the app depends too heavily on webpage fetching and Readability-style extraction, while the RSS item itself may already contain usable content.

The user wants a pragmatic solution rather than a large background-job system: the feed should appear quickly, the article list should become usable early, and the reader should show RSS-provided content immediately when available.

## Goals
- Make feed import feel fast for high-volume feeds by separating “feed added” from “all article bodies enriched”.
- Ensure antirez articles and similar feeds are readable immediately after import when RSS already contains article content.
- Keep the implementation small and consistent with the existing architecture.
- Preserve existing article enhancement behavior: webpage fetch + content cleaning should still improve stored content over time.

## Non-Goals
- No new generalized task queue, worker framework, or background-job dashboard.
- No per-article progress UI.
- No broad rewrite of `CleaningService` unless RSS fallback proves insufficient.
- No site-specific special case for antirez unless the fallback design still fails.

## Recommended Approach
### 1. Split feed visibility from article enrichment
Update `FeedService.addFeed()` so that adding a feed has two phases:
- Phase A: fetch and parse the RSS feed, create the feed row, create article rows, persist any RSS-provided content into `entry_contents`, and return success to the renderer immediately.
- Phase B: start a best-effort asynchronous enrichment pass for the imported entries. This pass fetches article webpages and runs `CleaningService` to improve `raw_html`, `cleaned_html`, and `cleaned_markdown` where needed.

The key behavioral change is that the feed becomes visible and usable after Phase A. Phase B is an enhancement step, not a prerequisite for success.

### 2. Treat RSS item content as first-class initial article content
Extend feed item parsing so `saveFeedItems()` extracts the richest available body candidate from RSS fields such as:
- `content`
- `content:encoded` / parser-exposed equivalents
- `summary`
- `contentSnippet` as a weaker fallback when richer HTML is unavailable

When such content exists, write it into `entry_contents` during import. This gives the reader an immediate body to display and gives downstream features something to work with before webpage enrichment finishes.

Preferred storage behavior:
- Store RSS HTML in `raw_html` when the source appears to be HTML content.
- Generate sanitized `cleaned_html` and `cleaned_markdown` from that RSS content immediately when feasible.
- If only plain text/snippet content exists, still generate a minimal readable fallback body rather than leaving the article empty.

### 3. Change article loading to prefer existing readable content
Update `ArticleService.getArticleContent()` so the lookup order is:
1. Existing cleaned content already in `entry_contents`
2. Existing RSS-derived readable content already stored in `entry_contents`
3. Fetch webpage HTML only if the article still lacks usable body content

This ensures the reader does not block on webpage fetches when the RSS item has already provided enough text to read.

### 4. Keep enrichment best-effort and per-entry isolated
The asynchronous enrichment pass should process entries independently:
- If webpage fetch succeeds, store the richer cleaned content.
- If webpage fetch fails, keep the RSS-derived content.
- If cleaning fails, preserve whatever readable content is already stored.
- A failure on one entry must not fail the overall feed import.

This is especially important for blogs with unusual HTML structures or anti-bot behavior.

## Data Flow
### Feed import
1. Renderer calls `add-feed`.
2. Main process `FeedService.addFeed()` fetches and parses RSS.
3. Feed row is created.
4. Entry rows are upserted.
5. RSS body content, when present, is written to `entry_contents`.
6. Feed add returns success immediately.
7. Background enrichment starts for imported entries and continues without blocking the caller.

### Article open
1. Renderer requests article content.
2. `ArticleService.getArticleContent()` checks DB content.
3. If readable content already exists, return it immediately.
4. Only if content is still missing does it fetch the original article webpage and clean it on demand.

## UI Behavior
Keep UI changes minimal.

Recommended first version:
- The new feed should appear quickly after import.
- The article list should become available as soon as entries are stored.
- Optional lightweight “importing” or “enriching” state can be added if easy, but it is not required for the first pass.

The important UX contract is responsiveness, not a complex progress surface.

## Error Handling
- RSS fetch/parse failure: fail the feed add entirely.
- Feed creation / entry upsert failure: fail the feed add entirely.
- Single article webpage fetch failure during enrichment: keep RSS-derived body and continue.
- Single article cleaning failure during enrichment: keep existing readable content and continue.
- On-demand webpage fetch failure while opening an article: return RSS-derived content if present; otherwise show the existing fallback behavior with the original-article link.

## Files Expected to Change
- `src/main/services/FeedService.ts`
  - Parse richer RSS content fields
  - Persist RSS-derived article bodies during import
  - Start asynchronous enrichment after initial import returns
- `src/main/services/ArticleService.ts`
  - Prefer stored readable content before fetching webpages
- `src/main/database/repository.ts`
  - Reuse `entry_contents`; only adjust helpers if needed for cleaner writes/reads
- Potentially `src/main/types/*`
  - Only if item parsing types need to be expanded for richer RSS content fields
- Optional small renderer updates if an import-state indicator is added

## Trade-Offs Considered
### Option A: Return early and enrich in background with RSS fallback (recommended)
Best UX improvement for the least architecture churn. Solves both slow import perception and missing-body issues together.

### Option B: Keep import synchronous, defer webpage fetch until article open
Smaller change, but large feed import still feels slow and first-open latency remains high.

### Option C: Only patch webpage cleaning for antirez
Too narrow. It would not address the broad “large feed import feels stuck” problem and would still fail on other feeds whose RSS content is already the better source.

## Test Plan
1. Add `https://antirez.com/rss`.
   - The feed should appear quickly after add.
   - The article list should populate without waiting for all webpage enrichment to finish.
2. Open an imported antirez article.
   - The reader should show actual body content, not just the title.
3. Simulate enrichment failure for one article.
   - Feed import should still succeed.
   - The affected article should still display RSS-derived content if available.
4. Verify ordinary feeds still import correctly.
5. Verify search/export/summary/translation continue to work using stored content after import and after enrichment.
6. Verify reopening an article after enrichment shows improved cleaned content when available.

## Open Implementation Notes
- Prefer a small helper in `FeedService` to extract the best RSS body candidate from each item rather than scattering field checks.
- Avoid introducing a persistent job table unless a later requirement needs resumable background tasks.
- If `rss-parser` does not expose some richer fields by default, extend the parser typing conservatively rather than restructuring the service.

## Recommendation Summary
Implement a two-phase import flow: make the feed and entries available immediately, store RSS-provided article content up front, and enrich articles asynchronously in the background. This keeps the codebase simple while directly addressing both the slow-import experience and the missing-antirez-body issue.