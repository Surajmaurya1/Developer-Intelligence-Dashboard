# Assumptions and decisions log

## Phase 1

- Use React Router's browser router with a lazy-loaded repository detail route; the route skeleton is intentionally minimal until its feature phase.
- Keep React Query focus refetch disabled initially to avoid unexpected background network calls; revisit defaults alongside API reliability work.
- Start query caching with a 30-second stale time and five-minute garbage-collection time; refine when endpoint behavior and per-feature needs are implemented.
- Use Tailwind CSS v4's official Vite plugin, avoiding a separate PostCSS configuration.
- No runtime schema dependency in the foundation; the API layer phase will decide whether runtime validation is justified.
- npm registry access was denied in this environment during installation, so dependency-backed checks could not run in Phase 1.

## Phase 2

- Keep GitHub DTOs and app-facing domain models separate; one mapper module owns snake_case conversion and null handling.
- Use a small typed fetch wrapper and hand-written DTO types instead of Zod. The app consumes a narrow, known subset of GitHub's documented REST responses; an extra runtime-schema dependency is not justified yet. If API-shape failures become a concern, add validation at this boundary.
- Classify exhausted core/search quota, 404, 422, 5xx, fetch failures, and aborts centrally. Only network and server failures retry, at most twice with bounded exponential delay; canceled and 4xx requests do not retry.
- Cap search pagination at 1,000 reachable matches and each request at GitHub's 100-item maximum.
- Format relative times with Intl.RelativeTimeFormat and keep date inputs as ISO strings in domain models.
- Keep open_issues_count as GitHub reports it; it includes pull requests. Filter pull requests from the separate issues endpoint using its pull_request field.
- npm has no cached packages and registry access remains restricted, so the new tests and build tools cannot run here yet.

## Phase 3

- Search input updates the URL after a 400 ms debounce, replacing the current history entry while explicit submit, mode changes, and pagination create navigable state changes.
- Preserve the prior results while a different query or page loads; dim them and mark the result region busy until the active query resolves.
- If a restored page number exceeds the result set's available pages, normalize it to the last available page (or page 1 for no matches) so the user is not left on an unreachable page.
- The mode control stores both modes in URL state now; the Users view reports that per-user result behavior is delivered in Phase 4.

## Phase 4

- User search uses the same URL-driven query and pagination behavior as repository search, with separate query keys and cached results per mode.
- Search results stay thin; each profile request starts only when its card enters a 180 px viewport margin.
- Limit profile-detail concurrency globally to three requests and remove queued work when its query is aborted. Cache successful details for one hour and retain them for one day.
- Keep user cards useful when profile details fail: the username, avatar, and profile link remain available while stats show a per-card fallback and retry.
- Surface throttled profile enrichments in one list-level banner and disable each card's retry until the reported reset time; when GitHub omits a reset, impose a 60-second retry cooldown.

## Phase 5

- Keep repository metadata and recent issues in independent React Query calls so either section can succeed, fail, and retry without replacing the other.
- Carry the originating search path and query in router history state for the detail-page return link; direct visits return to the default search route.
- Request issues ordered by update time with `per_page=100`, filter pull requests, and fetch up to five pages only when needed to fill the 20-item view. This handles PR-heavy repositories while bounding additional core API requests.
- Validate owner/repository path segments before issuing detail requests; GitHub remains the source of truth for whether a syntactically valid repository exists.
- Treat `subscribers_count` as optional in shared repository DTOs because search responses may omit it; never substitute the legacy watcher/stargazer count for actual watchers.

## Phase 6

- The reliability review found and fixed a browser Back/Forward race: local debounced input now resynchronizes whenever the router location key changes, even if the query text itself did not change.
- Preserve stale successful data when a background retry fails, while showing the typed error and a retry action beside that data.
- Distinguish a truly empty search from an empty page with a nonzero reported total; provide a path back to page 1 and normalize invalid result pages.
- Expose route and global render fallbacks with the same skip link and landmarks, and keep internal route errors out of user-facing text.
- Respect reduced-motion preferences during pagination scrolling and use minimum 44 px controls for primary buttons and mode selection.
- Static layout review supports narrow, tablet, and desktop widths. Browser keyboard/color-contrast walkthroughs and the production bundle measurement remain unverified because dependencies cannot currently be installed in this environment.

## Phase 7

- Organize the expanded suite around user-visible behavior at the existing unit and page integration boundaries; the race test deliberately lets the mocked fetch resolve after cancellation to prove stale results cannot replace the latest query.
- Add Vitest's matching V8 coverage provider as a dev-only dependency so `npm run test:coverage` can report text and HTML coverage alongside the established test suite.
- Browser-based visual/accessibility walkthroughs and live GitHub behavior remain outside the automated suite; those require a real browser session and live API access to verify.

## Phase 8

- Persist repository filters in `language` and `minStars` URL parameters, compose them into GitHub search qualifiers, and reset pagination when a filter changes. Debounce the minimum-star input to avoid issuing a request for each keystroke.
- Default the theme to the operating system preference before the app loads; persist explicit light/dark choices in local storage.
- Store typed repository snapshots for favorites so the favorites view works without network access; validate stored records and fall back to an empty list if browser storage is malformed or unavailable.

## Phase 9

- Upgrade Vitest and its matching coverage provider to 4.1.11 after npm audit identified [GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) in the earlier dev-only test runner. The patched release supports the project's Vite 7 and Node 22 versions; the final audit reports zero vulnerabilities.
- Keep the README's AI disclosure factual about the tools used and leave personal design/review claims as fill-in prompts for the project owner.
- Mark manual browser keyboard, screen-reader, and contrast checks as unverified instead of treating DOM-level automated tests as proof of those checks.
- Verify the lockfile in an isolated clean copy because Windows could not unlink a native CSS binary used by the original workspace; the supplied project directory also has no `.git` checkout for a literal clone verification.
- Record final V8 coverage from the clean install: 80.14% statements, 75.51% branches, 83.72% functions, and 81.56% lines across 55 tests.
