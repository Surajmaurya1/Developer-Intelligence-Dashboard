import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers())

  it('publishes the latest value after the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 400),
      { initialProps: { value: 'first' } },
    )
    rerender({ value: 'second' })
    act(() => vi.advanceTimersByTime(399))
    expect(result.current).toBe('first')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('second')
  })
})
