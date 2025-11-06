/**
 * Checks if a stylesheet is already loaded by checking document.styleSheets
 * This is more reliable than checking link.sheet because:
 * 1. Only successfully loaded stylesheets appear in styleSheets
 * 2. Works even for cross-origin stylesheets (we can check href)
 * 3. Handles cases where link exists but loading failed
 */
const isStylesheetLoaded = (url: string, doc: Document): boolean => {
  // Normalize URLs for comparison (handle absolute vs relative URLs)
  // Note: new URL() works with both absolute URLs (ignores base) and relative paths (uses base)
  try {
    const normalizedUrl = new URL(url, doc.location.href).href;
    return Array.from(doc.styleSheets).some(
      (sheet) => sheet.href && new URL(sheet.href, doc.location.href).href === normalizedUrl,
    );
  } catch {
    // If URL parsing fails, fall back to simple string comparison
    return Array.from(doc.styleSheets).some((sheet) => sheet.href === url);
  }
};

/**
 * Removes existing link element if it exists
 * This handles cases where link exists but loading failed or is still in progress
 */
const removeExistingLink = (url: string, doc: Document): void => {
  const existingLink = doc.head.querySelector(`link[href="${url}"]`) as HTMLLinkElement | null;
  if (existingLink?.parentNode) {
    existingLink.parentNode.removeChild(existingLink);
  }
};

/**
 * Creates a link element for stylesheet loading
 */
const createLinkElement = (url: string, doc: Document): HTMLLinkElement => {
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.type = 'text/css';
  return link;
};

/**
 * Loads a link element and returns a promise that resolves when loaded
 */
const loadLinkElement = (
  link: HTMLLinkElement,
  doc: Document,
  timeoutMs: number,
): Promise<boolean> => {
  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout | null = null;

    // Cleanup function
    const cleanup = (success: boolean) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Remove link element from DOM if loading failed
      if (!success && link.parentNode) {
        link.parentNode.removeChild(link);
      }

      link.onload = null;
      link.onerror = null;
      resolve(success);
    };

    // Set timeout
    timeoutId = setTimeout(() => cleanup(false), timeoutMs);

    // Set event handlers
    link.onload = () => cleanup(true);
    link.onerror = () => cleanup(false);

    // Add to DOM
    doc.head.appendChild(link);
  });
};

/**
 * Ensures a stylesheet is loaded, avoiding duplicate loading
 * Checks if stylesheet already exists and is loaded, removes failed links and reloads if needed
 * @param url - The URL of the stylesheet to load
 * @param doc - The document to load the stylesheet into
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise that resolves to true if loaded successfully, false otherwise
 */
export const loadStylesheet = async (
  url: string,
  doc: Document,
  timeoutMs = 30000,
): Promise<boolean> => {
  // Check if already loaded
  if (isStylesheetLoaded(url, doc)) {
    return true;
  }

  // Remove existing failed link if any
  removeExistingLink(url, doc);

  // Create and load new link element
  const link = createLinkElement(url, doc);
  return loadLinkElement(link, doc, timeoutMs);
};
