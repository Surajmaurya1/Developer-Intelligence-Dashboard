import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchPage } from '@/features/search/pages/SearchPage'
import { FavoritesProvider } from '@/shared/hooks/FavoritesProvider'
import { server } from '@/test/server'

const apiUrl = 'https://api.github.com/search/repositories'

function makeRepository(name: string) {
  return {
    id: name.length,
    name,
    full_name: `octocat/${name}`,
    description: null,
    owner: {
      id: 1,
      login: 'octocat',
      avatar_url: 'https://avatars.example/octocat.png',
      html_url: 'https://github.com/octocat',
    },
    html_url: `https://github.com/octocat/${name}`,
    language: null,
    stargazers_count: 1200,
    forks_count: 4,
    open_issues_count: 3,
    subscribers_count: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    default_branch: 'main',
  }
}

function CurrentSearchParams() {
  const [params] = useSearchParams()
  return <output aria-label="Current search URL">{params.toString()}</output>
}

function HistoryBackButton() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(-1)} type="button">
      Back in history
    </button>
  )
}

function renderSearch(
  entry = '/',
  entries: string[] = [entry],
  includeHistoryBack = false,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries}>
        <FavoritesProvider>
          <SearchPage />
          <CurrentSearchParams />
          {includeHistoryBack && <HistoryBackButton />}
        </FavoritesProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('repository search page', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    window.localStorage.removeItem('developer-intelligence-favorites')
    vi.stubGlobal('scrollTo', vi.fn())
    vi.stubGlobal('IntersectionObserver', undefined)
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('shows the initial state without requesting results', () => {
    renderSearch()

    expect(
      screen.getByRole('heading', { name: 'Find your next repository' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Repositories' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('shows an explicit empty state when a valid repository search has no matches', async () => {
    server.use(
      http.get(apiUrl, () =>
        HttpResponse.json({
          total_count: 0,
          incomplete_results: false,
          items: [],
        }),
      ),
    )
    renderSearch('/?mode=repos&q=not-a-real-repository')

    expect(
      await screen.findByRole('heading', { name: 'No repositories found' }),
    ).toBeInTheDocument()
  })

  it('shows a typed server error and retries the failed repository search', async () => {
    let requests = 0
    server.use(
      http.get(apiUrl, () => {
        requests += 1
        return requests === 1
          ? HttpResponse.json(
              { message: 'GitHub unavailable' },
              { status: 503 },
            )
          : HttpResponse.json({
              total_count: 1,
              incomplete_results: false,
              items: [makeRepository('recovered')],
            })
      }),
    )
    renderSearch('/?mode=repos&q=retry-test')

    expect(
      await screen.findByText(/GitHub is having trouble/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('link', { name: 'recovered' }),
    ).toBeInTheDocument()
    expect(requests).toBe(2)
  })

  it('shows a network error and retries after the connection recovers', async () => {
    let requests = 0
    server.use(
      http.get(apiUrl, () => {
        requests += 1
        return requests === 1
          ? HttpResponse.error()
          : HttpResponse.json({
              total_count: 1,
              incomplete_results: false,
              items: [makeRepository('online-again')],
            })
      }),
    )
    renderSearch('/?mode=repos&q=network-test')

    expect(
      await screen.findByText(/GitHub could not be reached/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('link', { name: 'online-again' }),
    ).toBeInTheDocument()
    expect(requests).toBe(2)
  })

  it('shows a validation error and allows a retry for a rejected search query', async () => {
    let requests = 0
    server.use(
      http.get(apiUrl, () => {
        requests += 1
        return requests === 1
          ? HttpResponse.json({ message: 'Validation Failed' }, { status: 422 })
          : HttpResponse.json({
              total_count: 0,
              incomplete_results: false,
              items: [],
            })
      }),
    )
    renderSearch('/?mode=repos&q=bad-query')

    expect(
      await screen.findByText(/GitHub could not interpret this search/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('heading', { name: 'No repositories found' }),
    ).toBeInTheDocument()
    expect(requests).toBe(2)
  })

  it('shows the rate limit reset time and can retry after a rate-limited response', async () => {
    let requests = 0
    const resetSeconds = Math.floor(Date.now() / 1000) + 300
    server.use(
      http.get(apiUrl, () => {
        requests += 1
        return requests === 1
          ? HttpResponse.json(
              { message: 'API rate limit exceeded' },
              {
                status: 403,
                headers: {
                  'x-ratelimit-remaining': '0',
                  'x-ratelimit-reset': String(resetSeconds),
                },
              },
            )
          : HttpResponse.json({
              total_count: 0,
              incomplete_results: false,
              items: [],
            })
      }),
    )
    renderSearch('/?mode=repos&q=limited')

    expect(await screen.findByText(/rate limit/i)).toBeInTheDocument()
    expect(screen.getByText(/Try again after/)).toHaveTextContent(
      new Date(resetSeconds * 1000).getFullYear().toString(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('heading', { name: 'No repositories found' }),
    ).toBeInTheDocument()
    expect(requests).toBe(2)
  })

  it('keeps the latest search visible when an earlier request resolves afterward', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const query = new URL(String(input)).searchParams.get('q') ?? ''
        if (query === 'alpha')
          await new Promise((resolve) => window.setTimeout(resolve, 700))
        return new Response(
          JSON.stringify({
            total_count: 1,
            incomplete_results: false,
            items: [makeRepository(`${query}-result`)],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }),
    )
    renderSearch()
    const search = screen.getByRole('searchbox', {
      name: 'Search repositories',
    })

    fireEvent.change(search, { target: { value: 'alpha' } })
    await act(
      async () => new Promise((resolve) => window.setTimeout(resolve, 450)),
    )
    fireEvent.change(search, { target: { value: 'beta' } })
    await act(
      async () => new Promise((resolve) => window.setTimeout(resolve, 450)),
    )
    expect(
      await screen.findByRole('link', { name: 'beta-result' }),
    ).toBeInTheDocument()
    await act(
      async () => new Promise((resolve) => window.setTimeout(resolve, 400)),
    )

    expect(
      screen.getByRole('link', { name: 'beta-result' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'alpha-result' }),
    ).not.toBeInTheDocument()
  })

  it('restores a shared query URL and renders useful repository results', async () => {
    server.use(
      http.get(apiUrl, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('q')).toBe('react')
        expect(url.searchParams.get('page')).toBe('2')
        return HttpResponse.json({
          total_count: 1500,
          incomplete_results: false,
          items: [makeRepository('react-core')],
        })
      }),
    )

    renderSearch('/?mode=repos&q=react&page=2')

    expect(
      await screen.findByRole('link', { name: 'react-core' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1.2k stars')).toBeInTheDocument()
    expect(screen.getByText('Language not specified')).toBeInTheDocument()
    expect(screen.getByText(/up to 1,000 results/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('persists language and minimum-star filters in the URL and search qualifiers', async () => {
    const user = userEvent.setup()
    const searchedQueries: string[] = []
    server.use(
      http.get(apiUrl, ({ request }) => {
        searchedQueries.push(new URL(request.url).searchParams.get('q') ?? '')
        return HttpResponse.json({
          total_count: 1,
          incomplete_results: false,
          items: [makeRepository('react-core')],
        })
      }),
    )
    renderSearch('/?mode=repos&q=react&page=3')

    await screen.findByRole('link', { name: 'react-core' })
    await user.selectOptions(screen.getByLabelText('Language'), 'TypeScript')
    await waitFor(() =>
      expect(screen.getByLabelText('Current search URL')).toHaveTextContent(
        'language=TypeScript',
      ),
    )
    expect(screen.getByLabelText('Current search URL')).not.toHaveTextContent(
      'page=',
    )
    await user.type(screen.getByLabelText('Minimum stars'), '500')
    await waitFor(
      () =>
        expect(screen.getByLabelText('Current search URL')).toHaveTextContent(
          'minStars=500',
        ),
      { timeout: 1500 },
    )
    await waitFor(() =>
      expect(searchedQueries).toContain(
        'react language:TypeScript stars:>=500',
      ),
    )
  })

  it('saves repositories to favorites and shows a removable favorites view', async () => {
    server.use(
      http.get(apiUrl, () =>
        HttpResponse.json({
          total_count: 1,
          incomplete_results: false,
          items: [makeRepository('favorite-repo')],
        }),
      ),
    )
    renderSearch('/?mode=repos&q=favorite')

    await screen.findByRole('link', { name: 'favorite-repo' })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add octocat/favorite-repo to favorites',
      }),
    )
    expect(
      screen.getByRole('button', {
        name: 'Remove octocat/favorite-repo from favorites',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Show favorites (1)' }))
    expect(
      await screen.findByRole('heading', { name: 'Favorite repositories' }),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove octocat/favorite-repo from favorites',
      }),
    )
    expect(
      await screen.findByText(/No favorite repositories yet/),
    ).toBeInTheDocument()
  })

  it('updates pagination in the URL and loads the next page', async () => {
    server.use(
      http.get(apiUrl, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page')
        return HttpResponse.json({
          total_count: 60,
          incomplete_results: false,
          items: [
            makeRepository(
              page === '2' ? 'second-page-repo' : 'first-page-repo',
            ),
          ],
        })
      }),
    )

    renderSearch('/?mode=repos&q=react')
    expect(
      await screen.findByRole('link', { name: 'first-page-repo' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('link', { name: 'second-page-repo' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByLabelText('Current search URL')).toHaveTextContent(
        'page=2',
      ),
    )
    expect(
      within(
        screen.getByRole('navigation', { name: 'Search result pages' }),
      ).getByRole('button', { name: 'Page 2' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('switches mode, preserves the query, and resets pagination', async () => {
    server.use(
      http.get(apiUrl, () =>
        HttpResponse.json({
          total_count: 0,
          incomplete_results: false,
          items: [],
        }),
      ),
      http.get('https://api.github.com/search/users', () =>
        HttpResponse.json({
          total_count: 0,
          incomplete_results: false,
          items: [],
        }),
      ),
    )
    renderSearch('/?mode=repos&q=react&page=4')
    fireEvent.click(screen.getByRole('radio', { name: 'Users' }))

    expect(screen.getByRole('radio', { name: 'Users' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByLabelText('Current search URL')).toHaveTextContent(
      'mode=users',
    )
    expect(screen.getByLabelText('Current search URL')).toHaveTextContent(
      'q=react',
    )
    expect(screen.getByLabelText('Current search URL')).not.toHaveTextContent(
      'page=',
    )
    expect(
      await screen.findByRole('heading', { name: 'No users found' }),
    ).toBeInTheDocument()
  })

  it('does not let a pending local edit overwrite Back navigation when the query is unchanged', async () => {
    server.use(
      http.get(apiUrl, () =>
        HttpResponse.json({
          total_count: 60,
          incomplete_results: false,
          items: [makeRepository('react-core')],
        }),
      ),
    )
    renderSearch(
      '/?mode=repos&q=react&page=2',
      ['/?mode=repos&q=react', '/?mode=repos&q=react&page=2'],
      true,
    )

    await screen.findByRole('link', { name: 'react-core' })
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search repositories' }),
      { target: { value: 'draft query' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back in history' }))
    await waitFor(() =>
      expect(
        screen.getByRole('searchbox', { name: 'Search repositories' }),
      ).toHaveValue('react'),
    )
    await act(
      async () => new Promise((resolve) => window.setTimeout(resolve, 450)),
    )

    expect(screen.getByLabelText('Current search URL')).toHaveTextContent(
      'q=react',
    )
    expect(screen.getByLabelText('Current search URL')).not.toHaveTextContent(
      'page=',
    )
  })

  it('searches users and enriches visible cards with profile details', async () => {
    server.use(
      http.get('https://api.github.com/search/users', () =>
        HttpResponse.json({
          total_count: 1,
          incomplete_results: false,
          items: [
            {
              id: 1,
              login: 'octocat',
              avatar_url: 'https://avatars.example/octocat.png',
              html_url: 'https://github.com/octocat',
            },
          ],
        }),
      ),
      http.get('https://api.github.com/users/octocat', () =>
        HttpResponse.json({
          id: 1,
          login: 'octocat',
          avatar_url: 'https://avatars.example/octocat.png',
          html_url: 'https://github.com/octocat',
          name: 'The Octocat',
          location: 'San Francisco',
          followers: 10,
          following: 5,
          public_repos: 8,
        }),
      ),
    )

    renderSearch('/?mode=users&q=octocat')

    expect(
      await screen.findByRole('link', { name: '@octocat' }),
    ).toHaveAttribute('href', 'https://github.com/octocat')
    expect(await screen.findByText('The Octocat')).toBeInTheDocument()
    expect(screen.getByText('10 followers')).toBeInTheDocument()
  })

  it('shows a list-level notice when user detail requests hit the core rate limit', async () => {
    server.use(
      http.get('https://api.github.com/search/users', () =>
        HttpResponse.json({
          total_count: 1,
          incomplete_results: false,
          items: [
            {
              id: 1,
              login: 'octocat',
              avatar_url: 'https://avatars.example/octocat.png',
              html_url: 'https://github.com/octocat',
            },
          ],
        }),
      ),
      http.get('https://api.github.com/users/octocat', () =>
        HttpResponse.json(
          { message: 'API rate limit exceeded' },
          {
            status: 403,
            headers: {
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 300),
            },
          },
        ),
      ),
    )

    renderSearch('/?mode=users&q=octocat')

    expect(
      await screen.findByText(
        /Some profile details are temporarily limited by GitHub/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Retry after rate limit resets' }),
    ).toBeDisabled()
  })
})
