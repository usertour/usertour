import { isVisibleNode } from '@usertour-ui/dom';
import { finderV2 } from '@usertour-ui/finder';
import { ElementSelectorPropsData } from '@usertour-ui/types';
import { isVisible } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { Evented } from './evented';
import { DEFAULT_TARGET_MISSING_SECONDS } from './common';

/**
 * Interface to track element visibility state
 */
type CheckContentIsVisible = {
  isHidden: boolean;
  startHiddenTs: number;
  checkHiddenTs: number;
  isTimeout: boolean;
};

// Constants for element watching configuration
const RETRY_LIMIT = 30; // Maximum number of retry attempts
const RETRY_DELAY = 200; // Delay between retries in milliseconds

/**
 * ElementWatcher class for monitoring DOM elements
 * Handles element finding, visibility checking, and timeout management
 */
export class ElementWatcher extends Evented {
  private target: ElementSelectorPropsData; // Target element selector data
  private timer: NodeJS.Timeout | null = null; // Timer for retry mechanism
  private element: Element | null = null; // Reference to the found element
  private checker: CheckContentIsVisible | null = null; // Visibility state tracker
  private targetMissingSeconds = DEFAULT_TARGET_MISSING_SECONDS; // Time allowed for target element to be missing

  constructor(target: ElementSelectorPropsData) {
    super();
    this.target = target;
  }

  /**
   * Sets the time allowed for target element to be missing
   * @param seconds - Time in seconds
   */
  setTargetMissingSeconds(seconds: number) {
    this.targetMissingSeconds = seconds;
  }

  /**
   * Attempts to find the target element in the DOM
   * @param retryTimes Current number of retry attempts
   */
  findElement(retryTimes = 0): void {
    this.clearTimer();

    if (retryTimes >= RETRY_LIMIT || retryTimes * RETRY_DELAY > this.targetMissingSeconds * 1000) {
      this.trigger(AppEvents.ELEMENT_FOUND_TIMEOUT);
      return;
    }

    if (!this.isDocumentReady() || !document?.body) {
      this.scheduleRetry(retryTimes);
      return;
    }

    const el = finderV2(this.target, document.body);
    if (!el) {
      this.scheduleRetry(retryTimes);
      return;
    }

    this.element = el;
    this.trigger(AppEvents.ELEMENT_FOUND, el);
  }

  /**
   * Checks if the found element is currently visible
   * @returns Object containing visibility state and timeout status
   */
  async checkVisibility(): Promise<{ isHidden: boolean; isTimeout: boolean }> {
    if (!this.element) {
      return { isHidden: true, isTimeout: false };
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

  /**
   * Schedules the next retry attempt to find the element
   * @param retryTimes Current number of retry attempts
   */
  private scheduleRetry(retryTimes: number) {
    this.timer = setTimeout(() => {
      this.findElement(retryTimes + 1);
    }, RETRY_DELAY);
  }

  /**
   * Cleans up resources and resets the watcher state
   */
  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.element = null;
  }

  /**
   * Clears the current retry timer
   */
  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

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
}
