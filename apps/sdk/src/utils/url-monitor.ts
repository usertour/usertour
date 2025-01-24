import { window } from "./globals";

// Add URL change monitoring with multiple fallback options
export const setupUrlChangeMonitoring = (callback: () => void) => {
  let lastUrl = window?.location.href;

  const handleUrlChange = () => {
    if (window?.location.href !== lastUrl) {
      lastUrl = window?.location.href;
      callback();
    }
  };

  // Method 1: MutationObserver (Modern browsers)
  if (window?.MutationObserver) {
    const urlObserver = new MutationObserver(handleUrlChange);

    if (document?.body) {
      urlObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Method 2: hashchange event (Legacy support)
  window?.addEventListener("hashchange", handleUrlChange);

  // Method 3: popstate event (History API)
  window?.addEventListener("popstate", handleUrlChange);

  // Method 4: Periodic check as final fallback
  setInterval(handleUrlChange, 1000);
};
