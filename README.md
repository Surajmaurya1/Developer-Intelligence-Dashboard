# Developer Intelligence Dashboard

A responsive GitHub explorer for searching public repositories and developers, inspecting repository details and recent issues, and saving repositories for later. It uses only GitHub's public REST API; there is no API key, backend, or environment configuration.

## Setup and run

Requirements: Node.js 20.19+ or 22.12+, and npm.

```sh
npm install
npm run dev
```

Other project commands:

```sh
npm run typecheck
npm run lint
npm test
npm run test:watch
npm run test:coverage
npm run build
npm run preview
```

The app is served locally by Vite. Search requests go directly to `https://api.github.com`.

## Architecture overview

```text
src/
  app/                    Router, application shell, route and render fallbacks
  features/
    search/                Search page, URL state, filters, cards, pagination, hooks
    repo-detail/           Repository details and independently queried issues
  shared/
    api/                   GitHub client, DTOs, mappers, endpoints, errors, query keys
    hooks/                 Debounce and favorites state
    lib/                   Search parameter and date/number formatting helpers
    types/                 App-facing GitHub domain types
    ui/                    Theme control and global responsive styles
  test/                    Vitest setup and MSW handlers/server
```

Search mode, query, page, language, and minimum stars are represented in the URL. Search hooks turn that state into React Query keys and pass the query cancellation signal to the typed API client. Endpoint DTOs are mapped into app-facing models before they reach the UI. Repository metadata and issues use separate queries so a failure in one section does not hide the other. User search requests thin profiles first; visible cards lazily request richer profile data through a small concurrency queue. Favorites and explicit theme choices are stored locally in the browser.

## Key technical decisions

### 1. State management

Decision: Use URL state for shareable search inputs and filters, local component state for transient editing/view state, React Query for remote data, and a small React context for favorites.

Alternatives considered: Redux/Zustand for all app state; keeping search state only in component state; putting server data in local storage.

Why I chose this: The URL restores and shares searches, React Query already owns remote loading/cache state, and the rest of the local state is small. Favorites need to be shared between cards and the favorites view.

Trade-off: Search URLs are longer, and favorites are scoped to the current browser profile rather than synchronized across devices.

### 2. API layer and data types

Decision: Keep one typed fetch client, narrow GitHub DTOs, centralized error classification, and one DTO-to-domain mapper boundary. Do not add runtime schema validation.

Alternatives considered: Fetch calls inside components; a generated API client; a runtime schema dependency such as Zod.

Why I chose this: The app consumes a small, known subset of GitHub responses, and a single boundary keeps headers, aborts, errors, and null handling consistent without adding another dependency.

Trade-off: Static types do not validate unexpected response shapes at runtime; mapper tests cover the fields and null cases the UI uses.

### 3. Caching

Decision: Use React Query with a 30-second default stale time and five-minute garbage-collection time. Cache user details for one hour and retain them for one day.

Alternatives considered: No cache, a global longer cache, or hand-maintained response caching.

Why I chose this: Repeated searches can reuse results while stale data remains reasonably fresh; richer user profiles are less likely to need frequent refreshes.

Trade-off: Cached counts and profile details can briefly lag GitHub. The user can revisit after the stale interval or refresh the page.

### 4. Search and asynchronous behavior

Decision: Debounce text and minimum-star edits by 400 ms, persist committed search state in the URL, keep previous results while the next request loads, and key each query by its normalized parameters. Pass AbortSignals through the API layer.

Alternatives considered: Fetch on every keystroke; clear results while loading; manually suppress stale responses in component state.

Why I chose this: Query keys, request cancellation, and URL state work together to deduplicate identical requests, preserve navigation, and avoid displaying an earlier response as the latest result.

Trade-off: Typed text can briefly differ from the committed URL while debounce is pending. Repository search pagination stops at GitHub's 1,000-result limit.

### 5. Performance

Decision: Lazy-load the repository detail route and user profile details, limit profile-detail concurrency to three, request issues in pages of up to 100, and avoid blanket memoization.

Alternatives considered: Fetch all user details immediately; request one issue at a time; memoize every component preemptively.

Why I chose this: The main search view stays small, user detail requests are rate-limited, and issue pagination only continues until the page is filled or the five-page bound is reached. React Query and React's normal rendering are adequate for the current data sizes.

Trade-off: Some user cards initially show a stats skeleton, and repositories with unusually many pull requests can require extra issue pages.

### 6. Rate limits and user enrichment

Decision: Classify GitHub's search/core rate limits centrally, display reset information where available, disable per-user retry until reset, and load profile enrichment near the viewport with a three-request concurrency cap.

Alternatives considered: Retry every failed request; show one global error for the whole user list; eagerly fetch all profiles.

Why I chose this: GitHub has stricter unauthenticated search limits than core limits. Isolating profile failures preserves useful usernames and links without creating a burst of requests.

Trade-off: Unauthenticated quota is still finite, and a profile can remain partially populated until its detail request is retried or cached data becomes stale.

## Trade-offs

- The app uses GitHub's public unauthenticated API, so search and core rate limits can affect results.
- Search API results are capped at 1,000 and each request asks for at most 100 items.
- `/search/users` is thin; richer fields require additional requests for visible cards.
- The repository issues view shows at most 20 non-pull-request issues and fetches no more than five API pages.
- `open_issues_count` is GitHub's value and includes pull requests. The displayed watchers value uses `subscribers_count`, not the legacy `watchers_count` alias.
- Favorites are validated local snapshots. They can become stale and are not synchronized across browsers or devices.
- No authentication, backend, offline API cache, or user account is provided.

## Assumptions

- Search qualifiers are composed into GitHub's `q` value while the human-entered query remains separately shareable in the URL.
- Minimum stars accepts a non-negative integer; an empty value removes the qualifier.
- Theme defaults to the operating system setting until the user stores an explicit choice.
- A direct repository detail visit returns to the default search page; navigation from search preserves the originating URL.
- API response fields used by the app are hand-typed and mapped centrally. Unexpected schema changes are surfaced through normal request/UI errors rather than a runtime validator.

The running phase-by-phase record is in [ASSUMPTIONS_DECISIONS.md](./ASSUMPTIONS_DECISIONS.md).

## Known limitations and unverified checks

- GitHub's public unauthenticated quotas and 1,000-result search cap are external limits.
- The app has not been walked through in a real browser with keyboard-only and screen-reader testing. Responsive layouts and reduced-motion behavior are implemented, but a manual WCAG contrast audit is still needed.
- Automated tests use MSW or mocked fetch; they do not prove live GitHub availability or current live API behavior.
- Favorites are local to one browser and store snapshots, so changed repository details are not refreshed while viewing favorites.
- The supplied workspace did not contain a `.git` checkout, so the clean-install check used an isolated copy of the project files rather than a fresh Git clone.

## Testing approach

- **Unit:** formatters, URL/search parsing, API error classification, retry policy, endpoint pagination, DTO mapping, and debounce behavior.
- **Integration:** React Testing Library and MSW cover repository/user search, URL restoration, filters, pagination, error/retry states, user detail enrichment, repository details, issue failures, favorites, and theme changes.
- **Race coverage:** a deliberately slow earlier search resolves after a newer search; the UI must keep the newer results.
- Run `npm test` for the full suite and `npm run test:coverage` for V8 text and HTML coverage.
- Latest clean-install run: 55 tests passed; V8 coverage was 80.14% statements, 75.51% branches, 83.72% functions, and 81.56% lines.

## AI usage disclosure

- **Tools used:** Codex desktop, PowerShell, npm, TypeScript, ESLint, Vitest, and the project's local build tools.
- **What AI was used for:** Assistance implementing and reviewing the phased React application, tests, dependency setup, and this documentation.
- **What I designed or decided myself:** The overall application architecture, feature prioritization, API and data flow, state management, URL-persisted search state, caching strategy, error/loading handling, request cancellation, and race-condition handling
- **Generated code I reviewed or changed:** I reviewed, tested, and modified AI\-generated code across the application to ensure it matched the project’s TypeScript types, architecture, API requirements, UX, accessibility, and performance expectations.
- **Important AI suggestion I rejected and why:** I rejected suggestions that introduced unnecessary complexity or additional infrastructure when a simpler solution was sufficient for the requirements and four\-hour time constraint\.

## What I would do next with more time

- Complete browser-based keyboard, screen-reader, responsive, and color-contrast reviews.
- Add optional authentication only if the product needs higher quotas, keeping tokens out of the client bundle.
- Consider refreshing favorite snapshots and synchronizing them only if a user account or backend becomes part of the product.
- Add runtime response validation if GitHub response changes or additional API consumers make the DTO boundary insufficient.

## Final requirements checklist

| Requirement                                                                      | Implementation                                                                     | Status                                                      |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| React, strict TypeScript, Vite, Router, React Query, Tailwind                    | `package.json`, `src/app`, `src/shared/ui/styles.css`                              | Done                                                        |
| Public GitHub API client, typed DTOs/domain types, mapping, safe errors, aborts  | `src/shared/api`, `src/shared/types`                                               | Done                                                        |
| Repository/user search, mode switch, shareable URL state, pagination, search cap | `src/features/search`, `src/shared/lib/searchParams.ts`                            | Done                                                        |
| Language and minimum-star filters in URL and GitHub qualifiers                   | `src/features/search/pages/SearchPage.tsx`                                         | Done                                                        |
| Lazy user details, concurrency cap, independent retry and rate-limit messaging   | `src/features/search/components/UserCard.tsx`, `src/shared/api/userDetailQueue.ts` | Done                                                        |
| Repository detail, independent issue query, PR filtering, recent issue limit     | `src/features/repo-detail`, `src/shared/api/endpoints.ts`                          | Done                                                        |
| Loading, empty, network/API/rate-limit/validation/not-found states and retry     | Search and detail feature pages/components                                         | Done                                                        |
| Responsive layouts, landmarks, labels, focus and reduced-motion handling         | `src/shared/ui/styles.css`, feature components                                     | Implemented; manual browser audit unverified                |
| Light/dark theme and saved favorites                                             | `src/shared/ui/ThemeToggle.tsx`, `src/shared/hooks/FavoritesProvider.tsx`          | Done                                                        |
| Unit/integration/race tests and coverage command                                 | `src/**/*.test.*`, `vite.config.ts`, `package.json`                                | Automated suite verified; see current test run              |
| Clean dependency install, typecheck, lint, test, production build                | `package-lock.json` and npm scripts                                                | Verified in an isolated clean project copy; 55 tests passed |
| Final README and six decision records                                            | This file                                                                          | Done                                                        |
| #                                                                                |
