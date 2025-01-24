// Define scroll options interface
interface ScrollOptions extends ScrollIntoViewOptions {
  timeout?: number;
}

export const smoothScroll = (
  elem: Element | null,
  options: ScrollOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Handle null element
    if (!elem) {
      reject(new Error("Element is null"));
      return;
    }

    if (!(elem instanceof Element)) {
      reject(new TypeError("Argument 1 must be an Element"));
      return;
    }

    let same = 0;
    let lastPos: number | null = null;
    let rafId: number;

    // Set default options
    const scrollOptions = {
      behavior: "smooth" as ScrollBehavior,
      timeout: 1000,
      ...options,
    };

    const { timeout, ...viewOptions } = scrollOptions;
    const timeoutId = setTimeout(() => {
      cancelAnimationFrame(rafId);
      resolve();
    }, timeout);

    elem!.scrollIntoView(viewOptions);
    rafId = requestAnimationFrame(check);

    function check() {
      const newPos = elem!.getBoundingClientRect().top;

      if (newPos === lastPos) {
        if (same++ > 2) {
          clearTimeout(timeoutId);
          resolve();
          return;
        }
      } else {
        same = 0;
        lastPos = newPos;
      }

      rafId = requestAnimationFrame(check);
    }
  });
};
