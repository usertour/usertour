import { ExternalStore } from '@/utils/store';
import { Evented } from '@/utils/evented';
import { UsertourSession } from '@/core/usertour-session';
import { UsertourCore } from '@/core/usertour-core';
import { UsertourSocket } from '@/core/usertour-socket';
import { autoBind } from '@/utils';
import { contentEndReason, Step, ThemeTypesSetting, ThemeVariation } from '@usertour/types';

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

  constructor(instance: UsertourCore, session: UsertourSession) {
    super();
    autoBind(this);
    this.instance = instance;
    this.session = session;

    // Get shared SocketService from core instance
    this.socketService = instance.getSocketService();

    this.id = this.getSessionId();
    this.store = new ExternalStore<TStore>(undefined);
  }

  // Abstract methods that subclasses must implement
  abstract show(params?: any): Promise<void>;
  abstract buildStoreData(): Promise<TStore | null>;
  abstract monitor(): Promise<void>;
  abstract destroy(): void;
  abstract reset(): void;
  abstract close(reason?: contentEndReason): Promise<void>;

  /**
   * Gets the component ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the session ID
   */
  protected getSessionId(): string {
    return this.session.getSessionId();
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
   * Hides the component
   */
  protected hide(): void {
    this.updateStore({ openState: false } as unknown as Partial<TStore>);
  }

  // Session method wrappers
  /**
   * Gets the steps array from session
   */
  protected getSteps(): Step[] {
    return this.session.getSteps();
  }

  /**
   * Gets the step by cvid from session
   */
  protected getStepByCvid(cvid: string): Step | undefined {
    return this.session.getStepByCvid(cvid);
  }

  /**
   * Gets the version theme settings from session
   */
  protected getVersionThemeSettings(): ThemeTypesSetting | undefined {
    return this.session.getVersionThemeSettings();
  }

  /**
   * Gets the version theme variations from session
   */
  protected getVersionThemeVariations(): ThemeVariation[] | undefined {
    return this.session.getVersionThemeVariations();
  }

  /**
   * Checks if the component has any steps
   */
  protected hasSteps(): boolean {
    return Boolean(this.getSteps().length);
  }
}
