import { ExternalStore } from '@/utils/store';
import { Evented } from '@/utils/evented';
import { timerManager } from '@/utils/timer-manager';
import { UsertourSession } from '@/core/usertour-session';
import { UsertourCore } from '@/core/usertour-core';
import { UsertourSocket } from '@/core/usertour-socket';
import { UsertourTheme } from '@/core/usertour-theme';
import { autoBind } from '@/utils';
import {
  ChecklistData,
  contentEndReason,
  LauncherData,
  Step,
  RulesCondition,
  ThemeTypesSetting,
} from '@usertour/types';
import { uuidV4, isEqual } from '@usertour/helpers';
import { CustomContentSession, SessionAttribute, SessionStep, SessionTheme } from '@/types/sdk';
import { ActionManager, ActionHandler } from '@/core/action-handlers';
import { BaseStore } from '@/types/store';
import { COMPONENT_CLOSED } from '@usertour-packages/constants';
import { convertToAttributeEvaluationOptions } from '@/core/usertour-helper';

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
export abstract class UsertourComponent<TStore extends BaseStore> extends Evented {
  // === Static Members ===
  protected static readonly Z_INDEX_OFFSET = 200;

  // === Properties ===
  protected readonly instance: UsertourCore;
  protected readonly session: UsertourSession;
  protected readonly socketService: UsertourSocket;
  protected readonly id: string;
  private store: ExternalStore<TStore>;
  private readonly options: ComponentOptions;
  private actionManager: ActionManager;

  // === Constructor ===
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
    this.actionManager = new ActionManager();

    // Initialize action handlers
    this.initializeActionHandlers();

    // Start checking automatically when component is created (if enabled)
    if (this.options.autoStartMonitoring) {
      this.startChecking(this.options.monitoringInterval);
    }
  }

  // === Abstract Methods ===
  /**
   * Checks the component state
   * Subclasses must implement this method
   */
  abstract check(): Promise<void>;

  /**
   * Initialize action handlers for this component
   * Subclasses should override this method to register their specific handlers
   */
  protected abstract initializeActionHandlers(): void;

  // === Public API Methods ===
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
   * Builds the complete store data for the component
   * This method combines base store data with component-specific data
   * @returns {TStore | null} The complete store data object
   */
  async buildStoreData(): Promise<TStore | null> {
    const baseData = await this.buildBaseStoreData();
    if (!baseData) {
      return null;
    }

    const customData = this.getCustomStoreData();

    return {
      ...baseData,
      ...customData,
    } as TStore;
  }

  /**
   * Refreshes the store data for the component
   */
  async refreshStoreData(): Promise<void> {
    const newStore = await this.buildStoreData();
    const existingStore = this.getStoreData();
    if (!newStore || !existingStore) {
      return;
    }

    // Extract common properties
    const { userAttributes, assets, globalStyle, themeSettings } = newStore;

    // Get custom store data
    const customData = this.getCustomStoreData();

    // Update store with common and specific data
    this.updateStore({
      userAttributes,
      assets,
      globalStyle,
      themeSettings,
      ...customData,
    });
  }

  /**
   * Handles actions using the strategy pattern
   * @param actions - The actions to handle
   */
  async handleActions(actions: RulesCondition[]): Promise<void> {
    await this.actionManager.handleActions(actions, this);
  }

  /**
   * Destroys the component with common cleanup logic
   */
  destroy(): void {
    // Stop checking
    this.stopChecking();
    // Reset component state
    this.reset();
    // Call component-specific cleanup
    this.onDestroy();
  }

  // === Monitoring & Checking ===
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

  // === Store Management ===
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
   * Gets custom store data - can be overridden by subclasses
   * @protected
   */
  protected getCustomStoreData(): Partial<TStore> {
    return {};
  }

  /**
   * Builds the base store data common to all components
   * This method handles theme settings, user attributes, and other common properties
   * @protected
   */
  protected async buildBaseStoreData(): Promise<Partial<BaseStore> | null> {
    const themeSettings = await this.getThemeSettings();
    if (!themeSettings) {
      return null;
    }

    const themeData = UsertourTheme.createThemeData(themeSettings);
    const contentSession = this.getSessionAttributes();
    const { userAttributes } = convertToAttributeEvaluationOptions(contentSession);
    const removeBranding = this.isRemoveBranding();
    const zIndex = this.getCalculatedZIndex();

    return {
      removeBranding,
      ...themeData,
      userAttributes,
      openState: false,
      zIndex,
    };
  }

  // === Component State ===
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

  /**
   * Resets the component state
   * @protected
   */
  protected reset(): void {
    // Clear store data
    this.setStoreData(undefined);
    // Call component-specific reset
    this.onReset();
  }

  // === Session Wrappers ===
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

  // === Theme Management ===
  /**
   * Gets theme settings from session
   * This method combines version theme with component-specific theme settings
   * @protected
   */
  protected async getThemeSettings(): Promise<ThemeTypesSetting | null> {
    const versionTheme = this.getVersionTheme();
    const customTheme = this.getCustomTheme();

    // Use custom theme if available, otherwise fall back to version theme
    const themeToUse = customTheme || versionTheme;

    if (!themeToUse) {
      return null;
    }

    return await UsertourTheme.getThemeSettings(themeToUse);
  }

  /**
   * Gets custom theme - can be overridden by subclasses
   * @protected
   */
  protected getCustomTheme(): SessionTheme | undefined {
    return undefined;
  }

  /**
   * Checks if theme has changed and updates theme settings if needed
   * @protected
   */
  protected async checkAndUpdateThemeSettings(): Promise<void> {
    const themeSettings = await this.getThemeSettings();
    if (!themeSettings) {
      return;
    }

    // Get current theme settings from store
    const currentStore = this.getStoreData();
    const currentThemeSettings = currentStore?.themeSettings;

    if (isEqual(currentThemeSettings, themeSettings)) {
      return;
    }

    // Update theme settings in store
    this.updateStore({ themeSettings } as Partial<TStore>);
  }

  // === Action Handlers ===
  /**
   * Register an action handler
   * @param handler - The handler to register
   */
  protected registerActionHandler(handler: ActionHandler): void {
    this.actionManager.registerHandler(handler);
  }

  /**
   * Register multiple action handlers
   * @param handlers - Array of handlers to register
   */
  protected registerActionHandlers(handlers: ActionHandler[]): void {
    this.actionManager.registerHandlers(handlers);
  }

  // === Utilities ===
  /**
   * Calculates the z-index for the component
   * @protected
   */
  protected getCalculatedZIndex(): number {
    const baseZIndex = this.instance.getBaseZIndex() ?? 0;
    return baseZIndex + UsertourComponent.Z_INDEX_OFFSET;
  }

  // === Lifecycle Hooks ===
  /**
   * Component-specific cleanup logic - can be overridden by subclasses
   * @protected
   */
  protected onDestroy(): void {
    // Default: no additional cleanup
  }

  /**
   * Component-specific reset logic - can be overridden by subclasses
   * @protected
   */
  protected onReset(): void {
    // Default: no additional reset
  }

  /**
   * Closes the component with the specified reason
   * @param reason - The reason for closing the component
   * @protected
   */
  protected async close(reason: contentEndReason = contentEndReason.USER_CLOSED): Promise<void> {
    const sessionId = this.getSessionId();
    // Hide the component
    this.hide();
    // Trigger the component closed event
    this.trigger(COMPONENT_CLOSED, { sessionId });
    // Destroy the component
    this.destroy();
    // End the content session
    await this.endContent(reason);
  }

  /**
   * Ends the content session
   * @param endReason - The reason for ending the content
   * @protected
   */
  protected async endContent(
    endReason: contentEndReason = contentEndReason.USER_CLOSED,
  ): Promise<void> {
    await this.socketService.endContent({
      sessionId: this.getSessionId(),
      endReason,
    });
  }
}
