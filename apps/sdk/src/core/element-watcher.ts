import { isVisibleNode } from '@usertour-ui/dom';
import { finderV2 } from '@usertour-ui/finder';
import { ElementSelectorPropsData } from '@usertour-ui/types';
import { isVisible } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { Evented } from './evented';

type CheckContentIsVisible = {
  isHidden: boolean;
  startHiddenTs: number;
  checkHiddenTs: number;
  isTimeout: boolean;
};

// Add constants for better maintainability
const RETRY_LIMIT = 30;
const RETRY_DELAY = 200;
const VISIBILITY_TIMEOUT = 6000;

export class ElementWatcher extends Evented {
  private target: ElementSelectorPropsData;
  private timer: NodeJS.Timeout | null = null;
  private element: Element | null = null;
  private checker: CheckContentIsVisible | null = null;

  constructor(target: ElementSelectorPropsData) {
    super();
    this.target = target;
  }

  findElement(retryTimes = 0): void {
    this.clearTimer();

    if (retryTimes >= RETRY_LIMIT) {
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

  private scheduleRetry(retryTimes: number) {
    this.timer = setTimeout(() => {
      this.findElement(retryTimes + 1);
    }, RETRY_DELAY);
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.element = null;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private isDocumentReady(): boolean {
    return !!document?.body;
  }

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
        isTimeout: now - this.checker.startHiddenTs > VISIBILITY_TIMEOUT,
      };
    }
  }
}
