const MAX_CONCURRENT_USER_DETAILS = 3

type QueueWaiter = {
  signal: AbortSignal
  resolve: (release: () => void) => void
  reject: (error: DOMException) => void
  onAbort: () => void
}

let activeRequests = 0
const waitingRequests: QueueWaiter[] = []

export async function withUserDetailConcurrency<T>(
  signal: AbortSignal,
  operation: () => Promise<T>,
): Promise<T> {
  const release = await acquireSlot(signal)
  try {
    return await operation()
  } finally {
    release()
  }
}

function acquireSlot(signal: AbortSignal): Promise<() => void> {
  if (signal.aborted) return Promise.reject(makeAbortError())
  if (activeRequests < MAX_CONCURRENT_USER_DETAILS) {
    activeRequests += 1
    return Promise.resolve(createRelease())
  }

  return new Promise((resolve, reject) => {
    const waiter: QueueWaiter = {
      signal,
      resolve,
      reject,
      onAbort: () => {
        const index = waitingRequests.indexOf(waiter)
        if (index >= 0) waitingRequests.splice(index, 1)
        signal.removeEventListener('abort', waiter.onAbort)
        reject(makeAbortError())
      },
    }
    waitingRequests.push(waiter)
    signal.addEventListener('abort', waiter.onAbort, { once: true })
  })
}

function createRelease(): () => void {
  let isReleased = false
  return () => {
    if (isReleased) return
    isReleased = true
    activeRequests -= 1

    while (waitingRequests.length > 0) {
      const waiter = waitingRequests.shift()
      if (!waiter) return
      waiter.signal.removeEventListener('abort', waiter.onAbort)
      if (waiter.signal.aborted) {
        waiter.reject(makeAbortError())
        continue
      }
      activeRequests += 1
      waiter.resolve(createRelease())
      return
    }
  }
}

function makeAbortError(): DOMException {
  return new DOMException(
    'The user detail request was cancelled.',
    'AbortError',
  )
}
