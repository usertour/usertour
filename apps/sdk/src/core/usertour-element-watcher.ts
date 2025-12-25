import { isVisibleNode } from '@usertour-packages/dom';
import { finderV2 } from '@usertour-packages/finder';
import { ElementSelectorPropsData } from '@usertour/types';
import { document, Evented } from '@/utils';
import { isVisible } from '@/core/usertour-helper';
import { timerManager } from '@/utils/timer-manager';
import { SDKClientEvents } from '@usertour-packages/constants';
import { uuidV4 } from '@usertour/helpers';

// === Types ===
/**
 * Interface to track element visibility state
 */
type CheckContentIsVisible = {
  isHidden: boolean;
  startHiddenTs: number;
  checkHiddenTs: number;
  isTimeout: boolean;
};

// === Constants ===
const RETRY_DELAY = 200; // Delay between retries in milliseconds
const DEFAULT_TARGET_MISSING_SECONDS = 6;

/**
 * ElementWatcher class for monitoring DOM elements
 * Handles element finding, visibility checking, and timeout management
 */
export class UsertourElementWatcher extends Evented {
  // === Properties ===
  private target: ElementSelectorPropsData; // Target element selector data
  private element: Element | null = null; // Reference to the found element
  private checker: CheckContentIsVisible | null = null; // Visibility state tracker
  private targetMissingSeconds = DEFAULT_TARGET_MISSING_SECONDS; // Time allowed for target element to be missing
  private readonly id: string; // Unique identifier for this watcher

  // === Constructor ===
  constructor(target: ElementSelectorPropsData) {
    super();
    this.target = target;
    this.id = uuidV4();
  }

  // === Configuration ===
  /**
   * Sets the time allowed for target element to be missing
   * @param seconds - Time in seconds
   */
  setTargetMissingSeconds(seconds: number) {
    this.targetMissingSeconds = seconds;
  }

  // === Element Finding ===
  /**
   * Attempts to find the target element in the DOM
   * @param retryTimes Current number of retry attempts
   */
  findElement(retryTimes = 0): void {
    timerManager.clearTimeout(`${this.id}-retry`);

    // Timeout based on configured targetMissingSeconds only
    if (retryTimes * RETRY_DELAY > this.targetMissingSeconds * 1000) {
      this.trigger(SDKClientEvents.ELEMENT_FOUND_TIMEOUT);
      return;
    }

    if (!this.isDocumentReady() || !document?.body) {
      this.scheduleRetry(retryTimes);
      return;
    }

    const el = this.findElementBySelector();
    if (!el) {
      this.scheduleRetry(retryTimes);
      return;
    }

    this.element = el;
    this.trigger(SDKClientEvents.ELEMENT_FOUND, el);
  }

  /**
   * Schedules the next retry attempt to find the element
   * @param retryTimes Current number of retry attempts
   */
  private scheduleRetry(retryTimes: number) {
    timerManager.setTimeout(
      `${this.id}-retry`,
      () => {
        this.findElement(retryTimes + 1);
      },
      RETRY_DELAY,
    );
  }

  // === Visibility Checking ===
  /**
   * Checks if the found element is currently visible
   * @returns Object containing visibility state and timeout status
   */
  async checkVisibility(): Promise<{ isHidden: boolean; isTimeout: boolean }> {
    if (!this.element) {
      return { isHidden: true, isTimeout: false };
    }

    // Check if the element is still in the current DOM tree and is the correct target
    // This handles SPA page changes where the element might have been removed or changed
    if (!this.isElementValid()) {
      // Try to find the element again with the same selector
      const el = this.findElementBySelector();
      if (el) {
        // Found a new element that matches our selector
        this.element = el;
        this.trigger(SDKClientEvents.ELEMENT_CHANGED, el);
      }
    }

    const isHidden =
      !isVisibleNode(this.element as HTMLElement) ||
      !(await isVisible(this.element as HTMLElement));

    if (!isHidden) {
      this.checker = null;
      return { isHidden: false, isTimeout: false };
    }

    const now = Date.now();
    this.updateChecker(isHidden, now);

    return {
      isHidden: true,
      isTimeout: this.checker?.isTimeout || false,
    };
  }

  // === State Management ===
  /**
   * Resets the element watcher state
   * Useful when SPA navigation occurs and we want to start fresh
   */
  reset(): void {
    timerManager.clearTimeout(`${this.id}-retry`);
    this.element = null;
    this.checker = null;
  }

  /**
   * Cleans up resources and resets the watcher state
   */
  destroy() {
    this.reset();
  }

  // === Private Helpers ===
  /**
   * Checks if the document is ready for element finding
   * @returns boolean indicating if document is ready
   */
  private isDocumentReady(): boolean {
    return !!document?.body;
  }

  /**
   * Updates the visibility checker state
   * @param isHidden Current visibility state
   * @param now Current timestamp
   */
  private updateChecker(isHidden: boolean, now: number): void {
    if (!this.checker) {
      this.checker = {
        isHidden,
        startHiddenTs: now,
        checkHiddenTs: now,
        isTimeout: false,
      };
    } else {
      this.checker = {
        ...this.checker,
        checkHiddenTs: now,
        isTimeout: now - this.checker.startHiddenTs > this.targetMissingSeconds * 1000,
      };
    }
  }

  /**
   * Checks if the element is still valid (present in DOM and matches target selector)
   * This handles cases where SPA navigation keeps old elements in DOM
   * but they're no longer the intended target
   * @returns boolean indicating if element is valid and matches target
   */
  private isElementValid(): boolean {
    if (!this.element || !document?.body) {
      return false;
    }

    // Check if element is still in DOM
    if (!document.body.contains(this.element)) {
      return false;
    }

    // Additional check: verify this element still matches our target selector
    // This handles cases where SPA navigation keeps old elements in DOM
    // but they're no longer the intended target
    try {
      const currentElement = this.findElementBySelector();
      if (!currentElement) {
        return false;
      }

      // If the found element is different from our stored element,
      // it means the page has changed and we should update our reference
      if (currentElement !== this.element) {
        return false;
      }

      return true;
    } catch {
      // If selector evaluation fails, assume element is no longer valid
      return false;
    }
  }

  /**
   * Finds the target element using finderV2
   * @returns Found element or null if not found
   */
  private findElementBySelector(): Element | null {
    if (!document?.body) {
      return null;
    }
    return finderV2(this.target, document.body);
  }
}
