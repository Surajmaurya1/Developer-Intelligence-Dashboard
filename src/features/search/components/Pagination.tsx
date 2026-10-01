import { SlidePagination } from '@/shared/ui/easyui/SlidePagination'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/**
 * Pagination is now powered by the EasyUI SlidePagination primitive, which
 * keeps the navigation role and button accessible names the tests rely on
 * while adding a sliding active indicator.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <SlidePagination
      ariaLabel="Search result pages"
      className="pagination"
      onPageChange={onPageChange}
      page={page}
      totalPages={totalPages}
    />
  )
}