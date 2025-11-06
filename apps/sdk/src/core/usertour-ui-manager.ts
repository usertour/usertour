import ReactDOM from 'react-dom/client';
import { render } from '@/components';
import { Evented } from '@/utils/evented';
import { ExternalStore } from '@/utils/store';
import { document, loadCSSResource, logger } from '@/utils';
import { ErrorMessages } from '@/types/error-messages';
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
  private root?: ReactDOM.Root;
  private isInitializing = false;
  private readonly config: Required<UIManagerConfig>;

  // === Constructor ===
  constructor(config: UIManagerConfig = {}) {
    super();
    this.config = {
      containerId: 'usertour-widget',
      maxRetries: 20,
      retryDelay: 1000,
      ...config,
    };
  }

  // === Public API ===
  /**
   * Initializes the UI manager with retry mechanism
   * This is the critical entry point for React rendering, so it supports retries
   * @param props - The properties to pass to the React root
   * @returns True if the UI manager is initialized, false otherwise
   */
  async initialize(props: UIManagerInitializeProps): Promise<boolean> {
    if (this.isInitializing) {
      // Wait for current initialization to complete
      return new Promise((resolve) => {
        this.once('initialization-complete', () => resolve(true));
        this.once('initialization-failed', () => resolve(false));
      });
    }

    this.isInitializing = true;

    // Retry the entire initialization process to ensure success
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Step 1: Ensure stylesheet is loaded
        await this.ensureStylesheet();
        // Step 2: Initialize UI
        this.initializeUI(props);
        // Success
        this.isInitializing = false;
        this.trigger('initialization-complete');
        return true;
      } catch (error) {
        logger.error(ErrorMessages.UI_INITIALIZATION_FAILED, error);

        const isLastAttempt = attempt >= this.config.maxRetries;
        if (isLastAttempt) {
          this.isInitializing = false;
          this.trigger('initialization-failed', error);
          return false;
        }

        await this.wait(this.config.retryDelay);
      }
    }

    // This should never be reached, but TypeScript requires it
    this.isInitializing = false;
    return false;
  }

  /**
   * Check if UI is ready
   */
  isReady(): boolean {
    return Boolean(this.container) && Boolean(this.root);
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
    this.cleanupRoot();
    this.cleanupContainer();
    this.isInitializing = false;
  }

  // === Document Validation ===
  /**
   * Ensures document is available
   * @returns The document object
   * @throws Error if document is not available
   */
  private ensureDocument(): Document {
    if (!document) {
      throw new Error(ErrorMessages.DOCUMENT_NOT_FOUND);
    }
    return document;
  }

  // === Stylesheet Loading ===
  /**
   * Ensures stylesheet is loaded
   * Checks DOM to avoid duplicate loading, loads if not present
   * @throws Error if stylesheet loading fails
   */
  private async ensureStylesheet(): Promise<void> {
    const doc = this.ensureDocument();
    const cssFile = getMainCss();

    // Check if stylesheet already exists in DOM
    const existingLink = doc.head.querySelector(`link[href="${cssFile}"]`);
    if (existingLink) {
      return;
    }

    const success = await loadCSSResource(cssFile, doc);
    if (!success) {
      throw new Error(ErrorMessages.FAILED_TO_LOAD_CSS);
    }
  }

  // === Container and Root Management ===
  /**
   * Initialize UI by setting up container and React root
   * If container changes, root will be recreated to ensure they are bound together
   * @throws Error if container creation or root initialization fails
   */
  private initializeUI(props: UIManagerInitializeProps): void {
    const doc = this.ensureDocument();

    // Get existing container from DOM
    const existingContainer = doc.getElementById(this.config.containerId);

    // If existing container is different from current, cleanup first
    if (existingContainer && existingContainer !== this.container) {
      // Remove existing container and cleanup old state
      if (existingContainer.parentNode) {
        existingContainer.parentNode.removeChild(existingContainer);
      }
      this.cleanupContainer();
      this.cleanupRoot();
    }

    // Create container if it doesn't exist
    if (!this.container) {
      const targetContainer = doc.createElement('div');
      targetContainer.id = this.config.containerId;
      doc.body.appendChild(targetContainer);
      this.container = targetContainer;
    }

    // If root already exists, skip creation
    if (this.root) {
      return;
    }

    // Create root
    try {
      this.root = ReactDOM.createRoot(this.container);
      render(this.root, props);
    } catch (error) {
      this.cleanupRoot();
      throw error;
    }
  }

  // === Cleanup Utilities ===
  /**
   * Clean up React root
   */
  private cleanupRoot(): void {
    if (!this.root) {
      return;
    }

    try {
      this.root.unmount();
    } catch (error) {
      logger.error(ErrorMessages.ERROR_UNMOUNTING_REACT_ROOT, error);
    } finally {
      this.root = undefined;
    }
  }

  /**
   * Clean up container element
   */
  private cleanupContainer(): void {
    if (!this.container) {
      return;
    }

    if (this.container.parentNode) {
      try {
        this.container.parentNode.removeChild(this.container);
      } catch (error) {
        logger.error(ErrorMessages.ERROR_REMOVING_CONTAINER, error);
      }
    }

    this.container = undefined;
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
