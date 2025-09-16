import { Evented } from '@/utils/evented';
import { autoBind } from '@/utils';
import { timerManager } from '@/utils/timer-manager';
import { uuidV4 } from '@usertour/helpers';
import { window } from '@/utils/globals';

/**
 * Options for URL monitoring
 */
interface URLMonitorOptions {
  /** Whether to start monitoring automatically (default: true) */
  autoStart?: boolean;
  /** Monitoring interval in milliseconds for SPA detection (default: 500) */
  interval?: number;
}

/**
 * Event data for URL change
 */
export type URLChangeEvent = {
  oldUrl: string;
  newUrl: string;
  timestamp: number;
};

/**
 * UsertourURLMonitor handles URL change detection
 */
export class UsertourURLMonitor extends Evented {
  private currentUrl = '';
  private readonly id: string;
  private readonly options: URLMonitorOptions;
  private intervalId: string | null = null;
  private isListening = false;

  constructor(options: URLMonitorOptions = {}) {
    super();
    autoBind(this);
    this.id = uuidV4();
    this.options = {
      autoStart: true,
      interval: 500,
      ...options,
    };
    this.currentUrl = window?.location.href || '';

    // Start monitoring automatically if enabled
    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Start URL monitoring
   */
  start(): void {
    if (this.isListening || !window) return;

    this.isListening = true;
    this.currentUrl = window.location.href;

    // Listen for browser navigation events
    window.addEventListener('popstate', this.handlePopState, { passive: true });
    window.addEventListener('hashchange', this.handleHashChange, { passive: true });

    // Poll for SPA navigation changes
    this.intervalId = `${this.id}-url-monitor`;
    timerManager.setInterval(
      this.intervalId,
      () => this.checkUrlChange(),
      this.options.interval || 500,
    );
  }

  /**
   * Stop URL monitoring
   */
  stop(): void {
    if (!this.isListening || !window) return;

    this.isListening = false;
    window.removeEventListener('popstate', this.handlePopState);
    window.removeEventListener('hashchange', this.handleHashChange);

    if (this.intervalId) {
      timerManager.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private handlePopState = (): void => {
    this.checkUrlChange();
  };

  private handleHashChange = (): void => {
    this.checkUrlChange();
  };

  private checkUrlChange(): void {
    if (!window) return;

    const newUrl = window.location.href;
    if (newUrl !== this.currentUrl) {
      const oldUrl = this.currentUrl;
      this.currentUrl = newUrl;

      this.trigger('url-changed', {
        oldUrl,
        newUrl,
        timestamp: Date.now(),
      });
    }
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  destroy(): void {
    this.stop();
  }
}
