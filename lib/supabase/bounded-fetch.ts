// Keep upstream failures inside the function budget, including response bodies.
export function createBoundedFetch(timeoutMs = 15_000): typeof fetch {
  return (input, init) => {
    const originalSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const timeout = AbortSignal.timeout(timeoutMs);
    return fetch(input, {
      ...init,
      signal: originalSignal ? AbortSignal.any([originalSignal, timeout]) : timeout,
    });
  };
}
