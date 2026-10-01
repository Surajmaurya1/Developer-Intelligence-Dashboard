import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RepoDetailPage from '@/features/repo-detail/pages/RepoDetailPage'
import { server } from '@/test/server'

const repoUrl = 'https://api.github.com/repos/octocat/hello'
const issuesUrl = `${repoUrl}/issues`

const repoDto = {
  id: 10,
  name: 'hello',
  full_name: 'octocat/hello',
  description: 'A useful project',
  owner: {
    id: 1,
    login: 'octocat',
    avatar_url: 'https://avatars.example/octocat.png',
    html_url: 'https://github.com/octocat',
  },
  html_url: repoUrl,
  language: 'TypeScript',
  stargazers_count: 500,
  forks_count: 42,
  open_issues_count: 12,
  subscribers_count: 7,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-02-01T00:00:00Z',
  default_branch: 'main',
  topics: ['react', 'typescript'],
}

const issueDto = {
  id: 1,
  number: 21,
  title: 'Add a keyboard shortcut',
  state: 'open',
  user: {
    id: 2,
    login: 'contributor',
    avatar_url: 'https://avatars.example/contributor.png',
    html_url: 'https://github.com/contributor',
  },
  html_url: 'https://github.com/octocat/hello/issues/21',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-02-03T00:00:00Z',
}

function renderPage(returnTo = '/?mode=repos&q=hello&page=2') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          { pathname: '/repo/octocat/hello', state: { returnTo } },
        ]}
      >
        <Routes>
          <Route element={<RepoDetailPage />} path="/repo/:owner/:name" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('repository detail page', () => {
  it('renders repository details, recent non-PR issues, and the preserved search link', async () => {
    server.use(
      http.get(repoUrl, () => HttpResponse.json(repoDto)),
      http.get(issuesUrl, () =>
        HttpResponse.json([
          issueDto,
          {
            ...issueDto,
            id: 2,
            number: 22,
            title: 'Pull request',
            pull_request: {
              url: 'https://api.github.com/repos/octocat/hello/pulls/22',
            },
          },
        ]),
      ),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'hello' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A useful project')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'Add a keyboard shortcut' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Pull request')).not.toBeInTheDocument()
    expect(
      screen.getByText('Open', { selector: '.issue-state' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Back to search/ }),
    ).toHaveAttribute('href', '/?mode=repos&q=hello&page=2')
    await waitFor(() =>
      expect(document.title).toBe('octocat/hello · Developer Intelligence'),
    )
  })

  it('keeps repository details available when the issues request fails and retries only issues', async () => {
    const repoRequest = vi.fn()
    let issueRequestCount = 0
    server.use(
      http.get(repoUrl, () => {
        repoRequest()
        return HttpResponse.json(repoDto)
      }),
      http.get(issuesUrl, () => {
        issueRequestCount += 1
        return HttpResponse.json(
          { message: 'Service unavailable' },
          { status: 503 },
        )
      }),
    )

    renderPage()
    expect(await screen.findByText('A useful project')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Retry issues' }))

    expect(
      await screen.findByRole('button', { name: 'Retry issues' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(issueRequestCount).toBe(2))
    expect(repoRequest).toHaveBeenCalledTimes(1)
    expect(issueRequestCount).toBe(2)
  })

  it('shows an explicit empty state when the repository has no open issues', async () => {
    server.use(
      http.get(repoUrl, () => HttpResponse.json(repoDto)),
      http.get(issuesUrl, () => HttpResponse.json([])),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'hello' }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/No issues found/)).toBeInTheDocument()
  })

  it('keeps recent issues available when the repository details request fails', async () => {
    server.use(
      http.get(repoUrl, () =>
        HttpResponse.json({ message: 'Service unavailable' }, { status: 503 }),
      ),
      http.get(issuesUrl, () => HttpResponse.json([issueDto])),
    )

    renderPage()

    expect(
      await screen.findByRole('button', { name: 'Retry repository details' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'Add a keyboard shortcut' }),
    ).toBeInTheDocument()
  })

  it('shows a clear not-found state for a missing repository', async () => {
    server.use(
      http.get(repoUrl, () =>
        HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
      ),
      http.get(issuesUrl, () =>
        HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
      ),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Repository not found' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Back to search/ }),
    ).toBeInTheDocument()
  })
})
