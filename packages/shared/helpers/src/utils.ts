/**
 * Deep clone utility function that uses structuredClone with fallback to JSON method
 * @param obj - The object to clone
 * @returns A deep copy of the object
 */
export const deepClone = <T>(obj: T): T => {
  try {
    return structuredClone(obj);
  } catch (error) {
    // Fallback to JSON method if structuredClone fails (e.g., circular references)
    console.warn('structuredClone failed, falling back to JSON method:', error);
    return JSON.parse(JSON.stringify(obj));
  }
};

export const parseUrlParams = (url: string, paramName: string): string | null => {
  if (!url || !paramName) {
    return null;
  }

  try {
    const urlObj = new URL(url);

    // 1. Check traditional query string
    const searchParams = new URLSearchParams(urlObj.search);
    if (searchParams.has(paramName)) {
      return searchParams.get(paramName);
    }

    // 2. Check hash part
    if (urlObj.hash) {
      // Handle both #/path?param=value and #?param=value formats
      const hashSearch = urlObj.hash.split('?')[1];
      if (hashSearch) {
        const hashParams = new URLSearchParams(hashSearch);
        if (hashParams.has(paramName)) {
          return hashParams.get(paramName);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
};

export const wait = (seconds: number): Promise<void> => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return Promise.reject(new Error('Invalid wait time: must be a number'));
  }

  if (seconds < 0) {
    return Promise.reject(new Error('Invalid wait time: cannot be negative'));
  }

  if (seconds === 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    try {
      setTimeout(resolve, seconds * 1000);
    } catch (error) {
      reject(error);
    }
  });
};
