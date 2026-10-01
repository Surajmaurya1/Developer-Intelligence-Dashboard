const numberFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const absoluteDateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
})

export function formatCompactNumber(value: number): string {
  return numberFormatter.format(value).replace('K', 'k')
}

export function formatAbsoluteDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return absoluteDateFormatter.format(date)
}

export function formatRelativeDate(
  value: string | Date,
  now = new Date(),
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'

  const elapsedSeconds = (date.getTime() - now.getTime()) / 1000
  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, seconds] of intervals) {
    if (Math.abs(elapsedSeconds) >= seconds)
      return formatter.format(Math.round(elapsedSeconds / seconds), unit)
  }
  return formatter.format(Math.round(elapsedSeconds), 'second')
}
