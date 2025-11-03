import { SDKClientEvents } from '@usertour-packages/constants';
import ReactDOM from 'react-dom/client';
import { render } from '@/components';
import { Evented } from '@/utils/evented';
import { ExternalStore } from '@/utils/store';
import { document, loadCSSResource, logger } from '@/utils';
import { getMainCss } from '@/core/usertour-env';
import { UsertourTour } from '@/core/usertour-tour';
import { UsertourChecklist } from './usertour-checklist';
import { UsertourLauncher } from './usertour-launcher';

// === Interfaces ===
export interface UIManagerConfig {
  containerId?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface UIManagerInitializeProps {
  toursStore: ExternalStore<UsertourTour[]>;
  checklistsStore: ExternalStore<UsertourChecklist[]>;
  launchersStore: ExternalStore<UsertourLauncher[]>;
}

/**
 * Manages UI lifecycle including CSS loading, container creation, and React root initialization
 */
export class UsertourUIManager extends Evented {
  // === Properties ===
  private container?: HTMLDivElement;
  private root: ReactDOM.Root | undefined;
  private isInitialized = false;
  private isInitializing = false;
  private readonly config: Required<UIManagerConfig>;

  // === Constructor ===
  constructor(config: UIManagerConfig = {}) {
    super();
    this.config = {
      containerId: 'usertour-widget',
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  // === Public API ===
  /**
   * Initializes the UI manager
   * @param props - The properties to pass to the React root
   * @returns True if the UI manager is initialized, false otherwise
   */
  async initialize(props: UIManagerInitializeProps): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.isInitializing) {
      // Wait for current initialization to complete
      return new Promise((resolve) => {
        this.once('initialization-complete', () => resolve(this.isInitialized));
        this.once('initialization-failed', () => resolve(false));
      });
    }

    this.isInitializing = true;

    try {
      // Step 1: Load CSS with retry mechanism
      const cssLoaded = await this.loadCssWithRetry();
      if (!cssLoaded) {
        throw new Error('Failed to load CSS after maximum retries');
      }

      // Step 2: Create container
      const containerCreated = this.createContainer();
      if (!containerCreated) {
        throw new Error('Failed to create container');
      }

      // Step 3: Create React root
      const rootCreated = await this.createRoot(props);
      if (!rootCreated) {
        throw new Error('Failed to create React root');
      }

      this.isInitialized = true;
      this.isInitializing = false;
      this.trigger('initialization-complete');
      return true;
    } catch (error) {
      logger.error('UI initialization failed:', error);
      this.isInitializing = false;
      this.trigger('initialization-failed', error);
      return false;
    }
  }

  /**
   * Check if UI is ready
   */
  isReady(): boolean {
    return this.isInitialized && Boolean(this.container) && Boolean(this.root);
  }

  /**
   * Get container element
   */
  getContainer(): HTMLDivElement | undefined {
    return this.container;
  }

  /**
   * Get React root
   */
  getRoot(): ReactDOM.Root | undefined {
    return this.root;
  }

  /**
   * Clean up UI resources
   */
  destroy(): void {
    try {
      // Unmount React root
      if (this.root) {
        this.root.unmount();
        this.root = undefined;
      }

      // Remove container
      if (this.container?.parentNode) {
        this.container.parentNode.removeChild(this.container);
        this.container = undefined;
      }

      this.isInitialized = false;
      this.isInitializing = false;
    } catch (error) {
      logger.error('Error during UI cleanup:', error);
    }
  }

  // === CSS Loading ===
  /**
   * Load CSS with retry mechanism
   */
  private async loadCssWithRetry(): Promise<boolean> {
    const cssFile = getMainCss();
    if (!document) {
      logger.error('Document not available for CSS loading');
      return false;
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const success = await loadCSSResource(cssFile, document);
        if (success) {
          this.trigger(SDKClientEvents.CSS_LOADED);
          return true;
        }

        if (attempt < this.config.maxRetries) {
          logger.warn(`CSS loading attempt ${attempt} failed, retrying...`);
          await this.delay(this.config.retryDelay);
        }
      } catch (error) {
        logger.error(`CSS loading attempt ${attempt} failed:`, error);
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    this.trigger(SDKClientEvents.CSS_LOADED_FAILED);
    return false;
  }

  // === Container Management ===
  /**
   * Create container element with proper error handling
   */
  private createContainer(): boolean {
    if (!document) {
      logger.error('Document not found for container creation');
      return false;
    }

    try {
      let container = document.getElementById(this.config.containerId) as HTMLDivElement;

      if (!container) {
        container = document.createElement('div');
        container.id = this.config.containerId;
        document.body.appendChild(container);
      }

      this.container = container;
      this.trigger(SDKClientEvents.CONTAINER_CREATED);
      return true;
    } catch (error) {
      logger.error('Failed to create container:', error);
      return false;
    }
  }

  // === React Root Management ===
  /**
   * Create React root with proper error handling
   */
  private async createRoot(props: UIManagerInitializeProps): Promise<boolean> {
    if (!this.container) {
      logger.error('Container not available for React root creation');
      return false;
    }

    try {
      if (!this.root) {
        this.root = ReactDOM.createRoot(this.container);
      }

      await render(this.root, props);
      return true;
    } catch (error) {
      logger.error('Failed to create React root:', error);
      return false;
    }
  }

  // === Utilities ===
  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
