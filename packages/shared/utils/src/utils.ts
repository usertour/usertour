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
