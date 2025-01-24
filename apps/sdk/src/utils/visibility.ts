import { window } from "./globals";
interface VisibilityObserverOptions {
  onVisible?: () => void;
  onHidden?: () => void;
}

/*
if (element) {
    const observer = new ElementVisibilityObserver(element, {
      onVisible: () => console.log('Element visible'),
      onHidden: () => console.log('Element hidden')
    });
  }
*/

// Global shared MutationObserver
class SharedMutationObserver {
  private static instance: SharedMutationObserver;
  private observer: MutationObserver;
  private observedElements: Map<Element, Set<() => void>> = new Map();

  private constructor() {
    // Add throttle to mutation handling
    this.observer = new MutationObserver(
      this.throttle((mutations: MutationRecord[]) => {
        const affectedElements = new Set<Element>();

        // Skip processing if too many mutations occur in a short time
        if (mutations.length > 100) {
          console.warn("Too many mutations detected, skipping some updates");
          return;
        }

        mutations.forEach((mutation: MutationRecord) => {
          // Skip if the mutation is caused by our own updates
          if (
            (mutation.target as Element).hasAttribute(
              "data-visibility-processing"
            )
          ) {
            return;
          }

          const target = mutation.target as Element;
          affectedElements.add(target);

          this.observedElements.forEach((_, el) => {
            if (target.contains(el)) {
              affectedElements.add(el);
            }
          });
        });

        // Trigger callbacks
        affectedElements.forEach((element) => {
          const callbacks = this.observedElements.get(element);
          callbacks?.forEach((callback) => callback());
        });
      }, 100) // Throttle to max once per 100ms
    );
  }

  // Add throttle implementation
  private throttle(fn: (...args: any[]) => void, limit: number) {
    let inThrottle: boolean = false;
    return function (this: SharedMutationObserver, ...args: any[]) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  static getInstance() {
    if (!SharedMutationObserver.instance) {
      SharedMutationObserver.instance = new SharedMutationObserver();
    }
    return SharedMutationObserver.instance;
  }

  observe(element: Element, callback: () => void) {
    if (!this.observedElements.has(element)) {
      this.observedElements.set(element, new Set());

      // Observe the element itself
      this.observer.observe(element, {
        attributes: true,
        attributeFilter: ["style", "class"],
        childList: false,
        subtree: false,
      });

      // Observe all parent elements
      let parent = element.parentElement;
      while (parent) {
        if (!this.observedElements.has(parent)) {
          this.observer.observe(parent, {
            attributes: true,
            attributeFilter: ["style", "class"],
            childList: false,
            subtree: false,
          });
        }
        parent = parent.parentElement;
      }
    }

    this.observedElements.get(element)?.add(callback);
  }

  unobserve(element: Element, callback: () => void) {
    const callbacks = this.observedElements.get(element);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.observedElements.delete(element);
        this.observer.disconnect();

        // Re-observe other elements
        this.observedElements.forEach((_, el) => {
          this.observer.observe(el, {
            attributes: true,
            attributeFilter: ["style", "class"],
            childList: false,
            subtree: false,
          });
        });
      }
    }
  }
}

export class ElementVisibilityObserver {
  private element: Element;
  private intersectionObserver: IntersectionObserver;
  private isVisible: boolean = false;
  private options: VisibilityObserverOptions;

  constructor(element: Element, options: VisibilityObserverOptions = {}) {
    this.element = element;
    this.options = options;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(() => this.debouncedCheckVisibility());
      },
      { threshold: 0 }
    );

    this.startObserving();
  }

  private checkVisibility = () => {
    const wasVisible = this.isVisible;
    this.isVisible = this.isElementVisible();

    if (this.isVisible !== wasVisible) {
      if (this.isVisible) {
        this.options.onVisible?.();
      } else {
        this.options.onHidden?.();
      }
    }
  };

  private isElementVisible(): boolean {
    if (!this.element) return false;

    try {
      // Special element handling
      if (this.element instanceof HTMLSelectElement) return true;
      if (
        this.element instanceof HTMLOptionElement &&
        this.element.parentElement instanceof HTMLSelectElement
      ) {
        return true;
      }

      const rootWindow = this.element.ownerDocument?.defaultView || window;
      if (!rootWindow) return false;

      let currentElement: Element | null = this.element;
      let currentWindow: Window = rootWindow;

      // Check if element has zero dimensions
      const elementRect = this.element.getBoundingClientRect();
      if (elementRect.width === 0 || elementRect.height === 0) {
        return false;
      }

      while (currentElement) {
        // Handle iframe traversal
        if (currentElement instanceof HTMLIFrameElement) {
          try {
            const iframeWindow: Window | null = currentElement.contentWindow;
            if (!iframeWindow) return false;
            currentWindow = iframeWindow;
            currentElement = iframeWindow.frameElement;
            continue;
          } catch (e) {
            // Cross-origin iframe, assume visible
            return true;
          }
        }

        const styles = currentWindow.getComputedStyle(currentElement);

        // Check basic visibility
        if (
          styles.display === "none" ||
          styles.visibility === "hidden" ||
          parseFloat(styles.opacity) < 0.01
        ) {
          return false;
        }

        // Check transform
        if (styles.transform !== "none") {
          const matrix = new DOMMatrix(styles.transform);
          if (matrix.m11 === 0 || matrix.m22 === 0) {
            // scale(0)
            return false;
          }
        }

        // Check clip properties
        if (
          styles.clipPath === "inset(100%)" ||
          styles.clip === "rect(0px, 0px, 0px, 0px)"
        ) {
          return false;
        }

        // Check scroll parent visibility
        if (this.isScrollable(currentElement)) {
          if (!this.isInScrollParent(this.element, currentElement)) {
            return false;
          }
        }

        // Position-specific checks
        const position = styles.position;
        const rect = currentElement.getBoundingClientRect();

        if (position === "fixed") {
          if (!this.isInViewport(rect, rootWindow)) {
            return false;
          }
        } else if (position === "absolute" || position === "relative") {
          const parentElement =
            (currentElement as HTMLElement).offsetParent ||
            currentElement.parentElement;
          if (parentElement && !this.isInParentBounds(rect, parentElement)) {
            return false;
          }
        }

        currentElement = currentElement.parentElement;
      }

      // Final viewport check
      return this.isInViewport(elementRect, rootWindow);
    } catch (error) {
      console.error("Visibility check error:", error);
      return false;
    }
  }

  // Helper methods
  private isScrollable(element: Element): boolean {
    const style = getComputedStyle(element);
    return (
      ["auto", "scroll"].includes(style.overflowY) ||
      ["auto", "scroll"].includes(style.overflowX)
    );
  }

  private isInScrollParent(element: Element, parent: Element): boolean {
    const elementRect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    return !(
      elementRect.bottom < parentRect.top ||
      elementRect.top > parentRect.bottom ||
      elementRect.right < parentRect.left ||
      elementRect.left > parentRect.right
    );
  }

  private isInViewport(rect: DOMRect, window: Window): boolean {
    const viewportHeight =
      window.innerHeight || window.document.documentElement?.clientHeight || 0;
    const viewportWidth =
      window.innerWidth || window.document.documentElement?.clientWidth || 0;

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewportHeight &&
      rect.right <= viewportWidth
    );
  }

  private isInParentBounds(rect: DOMRect, parent: Element): boolean {
    const parentRect = parent.getBoundingClientRect();
    return !(
      rect.right < parentRect.left ||
      rect.left > parentRect.right ||
      rect.bottom < parentRect.top ||
      rect.top > parentRect.bottom
    );
  }

  // Add performance optimization with debounce
  private debouncedCheckVisibility = this.debounce(this.checkVisibility, 100);

  private debounce(fn: () => void, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout>;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(), delay);
    };
  }

  startObserving() {
    this.intersectionObserver.observe(this.element);
    SharedMutationObserver.getInstance().observe(
      this.element,
      this.debouncedCheckVisibility
    );
  }

  stopObserving() {
    this.intersectionObserver.disconnect();
    SharedMutationObserver.getInstance().unobserve(
      this.element,
      this.checkVisibility
    );
  }
}
