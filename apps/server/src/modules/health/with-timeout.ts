// A probe that has not answered by then counts as failed: a black-holed
// connection must read as "down", not hang the health check.
export const PROBE_TIMEOUT_MS = 3_000;

export const withTimeout = async <T>(probe: Promise<T>, name: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${name} did not answer within ${PROBE_TIMEOUT_MS}ms`));
    }, PROBE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([probe, timeout]);
  } finally {
    clearTimeout(timer);
  }
};
