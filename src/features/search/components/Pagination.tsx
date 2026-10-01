type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const PAGE_WINDOW = 5

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null
  const start = Math.max(
    1,
    Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW + 1),
  )
  const end = Math.min(totalPages, start + PAGE_WINDOW - 1)
  const pages = Array.from(
    { length: end - start + 1 },
    (_, index) => start + index,
  )

  return (
    <nav aria-label="Search result pages" className="pagination">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        Previous
      </button>
      {pages.map((pageNumber) => (
        <button
          aria-current={pageNumber === page ? 'page' : undefined}
          aria-label={`Page ${pageNumber}`}
          key={pageNumber}
          onClick={() => onPageChange(pageNumber)}
          type="button"
        >
          {pageNumber}
        </button>
      ))}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Next
      </button>
    </nav>
  )
}
