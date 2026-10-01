import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Component,
  Suspense,
  lazy,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { RouteErrorPage } from '@/app/pages/RouteErrorPage'
import { queryRetryDelay, shouldRetryQuery } from '@/shared/api/retryPolicy'
import { SearchPage } from '@/features/search/pages/SearchPage'

const RepoDetailPage = lazy(
  () => import('@/features/repo-detail/pages/RepoDetailPage'),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
    },
  },
})

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The fallback deliberately avoids exposing internal error details.
    void error
    void info
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <header className="site-header">
            <div className="container header-inner">
              <a className="brand" href="/">
                Dev Intelligence
              </a>
            </div>
          </header>
          <main
            className="container page-content"
            id="main-content"
            tabIndex={-1}
          >
            <h1>Something went wrong</h1>
            <p>Try reloading the page.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </main>
          <footer className="site-footer">
            <div className="container">
              Built with data from the GitHub public API.
            </div>
          </footer>
        </div>
      )
    }

    return this.props.children
  }
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <SearchPage /> },
      {
        path: 'repo/:owner/:name',
        element: (
          <Suspense
            fallback={
              <p className="container page-content" role="status">
                Loading repository…
              </p>
            }
          >
            <RepoDetailPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
