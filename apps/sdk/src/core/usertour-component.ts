import { ExternalStore } from '@/utils/store';
import { Evented } from '@/utils/evented';
import { timerManager } from '@/utils/timer-manager';
import { UsertourSession } from '@/core/usertour-session';
import { UsertourCore } from '@/core/usertour-core';
import { UsertourSocket } from '@/core/usertour-socket';
import { autoBind } from '@/utils';
import { ChecklistData, contentEndReason, LauncherData, Step } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { CustomContentSession, SessionAttribute, SessionStep, SessionTheme } from '@/types/sdk';

/**
 * Options for component initialization
 */
interface ComponentOptions {
  /** Whether to start monitoring automatically (default: true) */
  autoStartMonitoring?: boolean;
  /** Monitoring interval in milliseconds (default: 200) */
  monitoringInterval?: number;
}

/**
 * Abstract base class for all Usertour components (Tour, Launcher, Checklist)
 * Provides common functionality and enforces a consistent interface
 */
export abstract class UsertourComponent<TStore> extends Evented {
  // Protected properties available to subclasses
  protected readonly instance: UsertourCore;
  protected readonly session: UsertourSession;
  protected readonly socketService: UsertourSocket;
  protected readonly id: string;
  private store: ExternalStore<TStore>;
  private readonly options: ComponentOptions;

  constructor(instance: UsertourCore, session: UsertourSession, options: ComponentOptions = {}) {
    super();
    autoBind(this);
    this.instance = instance;
    this.session = session;
    this.options = {
      autoStartMonitoring: true,
      monitoringInterval: 200,
      ...options,
    };

    // Get shared SocketService from core instance
    this.socketService = instance.getSocketService();

    this.id = uuidV4();
    this.store = new ExternalStore<TStore>(undefined);

    // Start checking automatically when component is created (if enabled)
    if (this.options.autoStartMonitoring) {
      this.startChecking(this.options.monitoringInterval);
    }
  }

  // Abstract methods that subclasses must implement
  abstract buildStoreData(): Promise<TStore | null>;
  abstract check(): Promise<void>;
  abstract destroy(): void;
  abstract reset(): void;
  abstract close(reason?: contentEndReason): Promise<void>;

  /**
   * Starts checking for this component
   * @param interval - Checking interval in milliseconds
   */
  protected startChecking(interval = 200): void {
    timerManager.addTask(
      `component-${this.id}-check`,
      async () => {
        await this.check();
      },
      interval,
    );
  }

  /**
   * Stops checking for this component
   */
  protected stopChecking(): void {
    timerManager.removeTask(`component-${this.id}-check`);
  }

  /**
   * Gets the component ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the session ID
   */
  getSessionId(): string {
    return this.session.getSessionId();
  }

  /**
   * Updates the session
   * @param session - The new session data
   */
  updateSession(session: CustomContentSession) {
    this.session.update(session);
  }

  /**
   * Subscribe to store changes - for external components
   */
  subscribe = (callback: () => void): (() => void) => {
    if (!this.store) {
      return () => {}; // Return empty unsubscribe function
    }
    return this.store.subscribe(callback);
  };

  /**
   * Get current store snapshot - for external components
   */
  getSnapshot = (): TStore | undefined => {
    if (!this.store) {
      return undefined;
    }
    return this.store.getSnapshot();
  };

  /**
   * Updates the store with new data
   */
  protected updateStore(data: Partial<TStore>): void {
    this.store.update(data);
  }

  /**
   * Sets the complete store data
   */
  protected setStoreData(data: TStore | undefined): void {
    this.store.setData(data);
  }

  /**
   * Gets the current store data
   */
  protected getStoreData(): TStore | undefined {
    return this.store.getSnapshot();
  }

  /**
   * Checks if store has data
   */
  protected hasStoreData(): boolean {
    return this.store.getSnapshot() !== undefined;
  }

  /**
   * Opens the component
   */
  protected open(): void {
    this.updateStore({ openState: true } as unknown as Partial<TStore>);
  }

  /**
   * Gets the content ID
   */
  getContentId(): string {
    return this.session.getContentId();
  }

  /**
   * Gets the version ID
   */
  getVersionId(): string {
    return this.session.getVersionId();
  }

  /**
   * Hides the component
   */
  protected hide(): void {
    this.updateStore({ openState: false } as unknown as Partial<TStore>);
  }

  // Session method wrappers
  /**
   * Gets the steps array from session
   */
  protected getSteps(): SessionStep[] {
    return this.session.getSteps();
  }

  /**
   * Gets the step by cvid from session
   */
  protected getStepByCvid(cvid: string): SessionStep | undefined {
    return this.session.getStepByCvid(cvid);
  }

  /**
   * Gets the step by id from session
   */
  protected getStepById(id: string): SessionStep | undefined {
    return this.session.getStepById(id);
  }

  /**
   * Gets the attributes from session
   */
  protected getSessionAttributes(): SessionAttribute[] {
    return this.session.getAttributes();
  }

  /**
   * Gets the current step from session
   */
  protected getCurrentStepFromSession(): Pick<Step, 'id' | 'cvid'> | undefined {
    return this.session.getCurrentStepFromSession();
  }

  /**
   * Gets the version theme from session
   */
  protected getVersionTheme(): SessionTheme | undefined {
    return this.session.getVersionTheme();
  }

  /**
   * Gets the checklist data from session
   */
  protected getChecklistData(): ChecklistData | undefined {
    return this.session.getChecklistData();
  }

  /**
   * Gets the launcher data from session
   */
  protected getLauncherData(): LauncherData | undefined {
    return this.session.getLauncherData();
  }

  /**
   * Checks if the component has any steps
   */
  protected hasSteps(): boolean {
    return this.getSteps().length > 0;
  }

  /**
   * Checks if the remove branding is enabled
   */
  protected isRemoveBranding(): boolean {
    return this.session.isRemoveBranding();
  }
}
