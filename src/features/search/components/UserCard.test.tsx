import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserCard } from '@/features/search/components/UserCard'
import type { User } from '@/shared/types/github'
import { server } from '@/test/server'

const user: User = {
  id: 1,
  login: 'octocat',
  avatarUrl: 'https://avatars.example/octocat.png',
  htmlUrl: 'https://github.com/octocat',
}
const detailUrl = 'https://api.github.com/users/octocat'

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string
  readonly thresholds: ReadonlyArray<number>
  readonly observe = vi.fn((target: Element) => {
    this.target = target
  })
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
  private target: Element | null = null

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.rootMargin = options?.rootMargin ?? '0px'
    const threshold = options?.threshold
    this.thresholds =
      threshold === undefined
        ? [0]
        : typeof threshold === 'number'
          ? [threshold]
          : threshold
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  enterViewport(): void {
    if (!this.target) return
    const entry = {
      isIntersecting: true,
      intersectionRatio: 1,
      target: this.target,
      time: 0,
      boundingClientRect: new DOMRect(),
      intersectionRect: new DOMRect(),
      rootBounds: null,
    } as IntersectionObserverEntry
    this.callback([entry], this)
  }
}

let activeObservers: MockIntersectionObserver[] = []

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <UserCard
        onRateLimit={() => undefined}
        onRateLimitCleared={() => undefined}
        user={user}
      />
    </QueryClientProvider>,
  )
}

describe('UserCard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('waits until the card approaches the viewport before loading profile details', async () => {
    activeObservers = []
    vi.stubGlobal(
      'IntersectionObserver',
      class extends MockIntersectionObserver {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit,
        ) {
          super(callback, options)
          activeObservers.push(this)
        }
      },
    )
    const request = vi.fn()
    server.use(
      http.get(detailUrl, () => {
        request()
        return HttpResponse.json({
          id: 1,
          login: 'octocat',
          avatar_url: user.avatarUrl,
          html_url: user.htmlUrl,
          name: 'The Octocat',
          location: 'San Francisco',
          followers: 10,
          following: 5,
          public_repos: 8,
        })
      }),
    )

    renderCard()
    expect(screen.getByRole('link', { name: '@octocat' })).toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()

    const observer = activeObservers[0]
    if (!observer) throw new Error('Expected an intersection observer')
    act(() => observer.enterViewport())

    expect(await screen.findByText('The Octocat')).toBeInTheDocument()
    expect(screen.getByText('10 followers')).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('keeps the profile link visible and lets a failed detail request be retried', async () => {
    activeObservers = []
    vi.stubGlobal(
      'IntersectionObserver',
      class extends MockIntersectionObserver {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit,
        ) {
          super(callback, options)
          activeObservers.push(this)
        }
      },
    )
    let requestCount = 0
    server.use(
      http.get(detailUrl, () => {
        requestCount += 1
        if (requestCount === 1)
          return HttpResponse.json(
            { message: 'GitHub unavailable' },
            { status: 503 },
          )
        return HttpResponse.json({
          id: 1,
          login: 'octocat',
          avatar_url: user.avatarUrl,
          html_url: user.htmlUrl,
          name: null,
          location: null,
          followers: 10,
          following: 5,
          public_repos: 8,
        })
      }),
    )

    renderCard()
    const observer = activeObservers[0]
    if (!observer) throw new Error('Expected an intersection observer')
    act(() => observer.enterViewport())

    expect(
      await screen.findByText('Profile details are unavailable right now.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '@octocat' })).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry profile details' }),
    )

    expect(await screen.findByText('10 followers')).toBeInTheDocument()
    expect(requestCount).toBe(2)
  })
})
