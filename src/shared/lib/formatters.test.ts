import { describe, expect, it } from 'vitest'
import {
  formatAbsoluteDate,
  formatCompactNumber,
  formatRelativeDate,
} from '@/shared/lib/formatters'

describe('formatters', () => {
  it('formats compact counts', () => {
    expect(formatCompactNumber(1200)).toBe('1.2k')
    expect(formatCompactNumber(3_400_000)).toBe('3.4M')
  })

  it('formats valid and invalid absolute dates', () => {
    expect(formatAbsoluteDate('not a date')).toBe('Unknown date')
    expect(formatAbsoluteDate('2024-01-01T00:00:00.000Z')).toContain('2024')
  })

  it('formats relative dates against a known reference time', () => {
    const now = new Date('2024-01-02T00:00:00.000Z')
    expect(formatRelativeDate('2024-01-01T00:00:00.000Z', now)).toBe(
      'yesterday',
    )
  })
})
