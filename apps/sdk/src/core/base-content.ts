import { convertSettings, isValidContent } from '@usertour/helpers';
import { convertToCssVars, findLatestEvent } from '@usertour/helpers';
import {
  BizCompany,
  ContentDataType,
  SDKConfig,
  SDKContent,
  Step,
  Theme,
  UserTourTypes,
  contentStartReason,
} from '@usertour/types';
import { autoBind, window } from '@/utils';
import { UsertourCore } from '@/core/usertour-core';
import { getAssets } from '@/core/common';
import { Config } from '@/core/config';
import { Evented } from '@/core/evented';
import { ExternalStore } from '@/core/store';
import { differenceInHours } from 'date-fns';
import { logger, getActivedTheme, buildNavigateUrl } from '@/utils';
import { BaseStore } from '@/types';
import isEqual from 'fast-deep-equal';

export abstract class BaseContent<T extends BaseStore = any> extends Evented {
  private readonly instance: UsertourCore;
  private content: SDKContent;
  private readonly store: ExternalStore<T>;
  private readonly config: Config;
  private isDismissed = false;
  private isStarted = false;
  private sessionId = '';
  private currentStep?: Step | null;
  constructor(instance: UsertourCore, content: SDKContent, defaultStore?: T) {
    super();
    autoBind(this);
    this.store = new ExternalStore<T>(defaultStore);
    this.config = new Config(content.config);
    this.instance = instance;
    this.content = structuredClone(content);
    this.initializeEventListeners();
  }

  /**
   * Automatically starts the content
   * @param reason - The reason for starting the content
   * @returns {Promise<void>} A promise that resolves when the content is started
   */
  async autoStart(reason?: string) {
    if (!this.canAutoStart()) {
      return;
    }
    if (this.hasStarted()) {
      return;
    }
    this.reset();

    if (this.isWaitStart()) {
      await this.waitStart();
    }

    await this.start(reason);
  }

  /**
   * Starts the content
   * @param reason - The reason for starting the content
   * @param cvid - The cvid for the content
   * @returns {Promise<void>} A promise that resolves when the content is started
   */
  async start(reason?: string, cvid?: string) {
    const reusedSessionId = this.getReusedSessionId();
    const sessionId = reusedSessionId || (await this.createSessionId(reason));
    if (!sessionId) {
      throw new Error('Failed to create user session.');
    }
    this.sessionId = sessionId;
    this.setStarted(true);
    await this.show(cvid);
    // Handle additional logic after content is shown
    await this.handleAfterShow(!reusedSessionId);
  }

  /**
   * Checks if the content can auto start
   * @returns {boolean} True if the content can auto start, false otherwise
   */
  canAutoStart(): boolean {
    return !this.hasStarted() && this.isAutoStart() && this.isValid();
  }

  /**
   * Checks if the content has been dismissed
   * @returns {boolean} True if the content has been dismissed, false otherwise
   */
  hasDismissed(): boolean {
    return this.isDismissed;
  }

  /**
   * Sets the dismissed state
   * @param value - The value to set the dismissed state to
   */
  setDismissed(value: boolean) {
    this.isDismissed = value;
  }

  /**
   * Sets the started state
   * @param value - The value to set the started state to
   */
  setStarted(value: boolean) {
    this.isStarted = value;
  }

  /**
   * Checks if the content has been started
   * @returns {boolean} True if the content has been started, false otherwise
   */
  hasStarted() {
    return this.isStarted;
  }

  /**
   * Get the session ID
   * @returns {string} The session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Get the content
   * @returns {SDKContent} The content
   */
  getContent() {
    return this.content;
  }

  /**
   * Sets the content
   * @param content - The content to set
   */
  setContent(content: SDKContent) {
    this.content = structuredClone(content);
    this.config.setConfig(content.config);
  }

  /**
   * Removes the latest session from the content
   */
  removeContentLatestSession() {
    if (this.content?.latestSession) {
      this.content.latestSession = undefined;
    }
  }

  /**
   * Checks if the content is valid
   * @returns {boolean} True if the content is valid, false otherwise
   */
  isValid() {
    const contents = this.getOriginContents();
    if (!contents) {
      return false;
    }
    return isValidContent(this.getContent(), contents);
  }

  /**
   * Get the instance
   * @returns {App} The instance
   */
  private getInstance() {
    return this.instance;
  }

  /**
   * Get the config
   * @returns {Config} The config
   */
  private getConfig() {
    return this.config;
  }

  /**
   * Get the store
   * @returns {ExternalStore<T>} The store
   */
  getStore() {
    return this.store;
  }

  /**
   * Set the store
   * @param store - The store to set
   */
  setStore(store: T | undefined) {
    this.store.setData(store);
  }

  /**
   * Check if the content is open
   * @returns {boolean} True if the content is open, false otherwise
   */
  isOpen(): boolean {
    return this.getStore()?.getSnapshot()?.openState === true;
  }

  /**
   * Open the store
   */
  open() {
    this.updateStore({ openState: true } as Partial<T>);
  }

  /**
   * Hide the store
   */
  hide() {
    this.updateStore({ openState: false } as Partial<T>);
  }

  /**
   * Update the store
   * @param store - The store to update
   */
  updateStore(store: Partial<T>) {
    this.store.update(store);
  }

  /**
   * Check if the content is waiting to start
   * @returns {boolean} True if the content is waiting to start, false otherwise
   */
  isWaitStart(): boolean {
    return this.getConfig().isWait();
  }

  /**
   * Wait for the content to start
   * @returns {Promise<void>} A promise that resolves when the content is waiting to start
   */
  async waitStart() {
    return await this.getConfig().wait();
  }

  /**
   * Check if the content is auto start
   * @returns {boolean} True if the content is auto start, false otherwise
   */
  isAutoStart(): boolean {
    return this.getConfig().isAutoStart();
  }

  /**
   * Get the config priority
   * @returns {number} The config priority
   */
  getConfigPriority() {
    return this.getConfig().getPriority();
  }

  /**
   * Check if the content is temporarily hidden
   * @returns {boolean} True if the content is temporarily hidden, false otherwise
   */
  isTemporarilyHidden() {
    return this.getConfig().isTemporarilyHidden();
  }

  /**
   * Check if the content has a container
   * @returns {boolean} True if the content has a container, false otherwise
   */
  hasContainer() {
    return !!this.getInstance().container;
  }

  /**
   * Get the user information
   * @returns {Object} The user information
   */
  getUserInfo() {
    return this.getInstance().userInfo;
  }

  /**
   * Get the themes
   * @returns {Object} The themes
   */
  getThemes() {
    return this.getInstance().themes;
  }

  /**
   * Get the origin contents
   * @returns {Object} The origin contents
   */
  getOriginContents() {
    return this.getInstance().originContents;
  }

  /**
   * Get the base z-index
   * @returns {number} The base z-index
   */
  getBaseZIndex() {
    return this.getInstance().getBaseZIndex();
  }

  /**
   * Starts a tour
   * @param contentId - The ID of the content to start
   * @param reason - The reason for starting the tour
   * @returns {Promise<void>} A promise that resolves when the tour is started
   */
  startTour(contentId: string | undefined, reason: string, cvid?: string) {
    console.log('startTour', contentId, reason, cvid);
  }

  /**
   * Starts a checklist
   * @param contentId - The ID of the content to start
   * @param reason - The reason for starting the checklist
   * @returns {Promise<void>} A promise that resolves when the checklist is started
   */
  startChecklist(contentId: string | undefined, reason: string) {
    console.log('startChecklist', contentId, reason);
  }

  /**
   * Get the active tour
   * @returns {Object} The active tour
   */
  getActiveTour() {
    return this.getInstance().activeTour;
  }

  /**
   * Sets the current step
   * @param step - The step to set
   */
  setCurrentStep(step: Step | null) {
    this.currentStep = step;
  }

  /**
   * Get the current step
   * @returns {Step | null} The current step
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * Updates the user attributes
   * @param attributes - The attributes to update
   * @returns {Promise<void>} A promise that resolves when the user attributes are updated
   */
  async updateUser(attributes: UserTourTypes.Attributes) {
    return await this.getInstance().updateUser(attributes);
  }

  /**
   * Creates a new session ID
   */
  async createSessionId(reason = 'auto_start'): Promise<string | null> {
    console.log('createSessionId', reason);
    return null;
    // const contentId = this.getContent().contentId;
    // const session = await this.getInstance().createSession(contentId, reason);
    // return session ? session.id : null;
  }

  /**
   * Checks if the session is timed out
   * @returns {boolean} True if the session is timed out, false otherwise
   */
  sessionIsTimeout(): boolean {
    const content = this.getContent();
    const bizEvents = content.latestSession?.bizEvent;
    if (!bizEvents) {
      return false;
    }
    const latestEvent = findLatestEvent(bizEvents);
    const sessionTimeoutHours = this.getInstance().getSessionTimeout();
    if (latestEvent?.createdAt) {
      const now = new Date();
      const eventTime = new Date(latestEvent.createdAt);
      return differenceInHours(now, eventTime) > sessionTimeoutHours;
    }
    return false;
  }

  /**
   * Get the target missing seconds
   * @returns {number} The target missing seconds
   */
  getTargetMissingSeconds() {
    return this.getInstance().getTargetMissingSeconds();
  }

  /**
   * Get the company information
   */
  getCompanyInfo(): BizCompany | undefined {
    return this.getInstance().companyInfo;
  }

  /**
   * Starts a new tour
   * @param contentId - The ID of the content to start
   */
  async startNewTour(contentId: string, cvid?: string) {
    await this.startTour(contentId, contentStartReason.ACTION, cvid);
  }

  /**
   * Starts a new content
   * @param contentId - The ID of the content to start
   */
  async startNewContent(contentId: string, cvid?: string): Promise<void> {
    const content = this.getOriginContents()?.find((item) => item.contentId === contentId);
    if (content?.type === ContentDataType.CHECKLIST) {
      await this.startNewChecklist(contentId);
    } else if (content?.type === ContentDataType.FLOW) {
      await this.startNewTour(contentId, cvid);
    } else {
      logger.error(`Unsupported content type: ${content?.type}`);
    }
  }

  /**
   * Starts a new checklist
   * @param contentId - The ID of the content to start
   */
  async startNewChecklist(contentId: string): Promise<void> {
    await this.startChecklist(contentId, contentStartReason.ACTION);
  }
  /**
   * Handles the navigation
   * @param data - The data to navigate
   */
  handleNavigate(data: any) {
    const userInfo = this.getUserInfo();
    const url = buildNavigateUrl(data.value, userInfo);

    // Check if custom navigation function is set
    const customNavigate = this.getInstance().getCustomNavigate();
    if (customNavigate) {
      // Use custom navigation function
      customNavigate(url);
    } else {
      // Use default behavior
      window?.top?.open(url, data.openType === 'same' ? '_self' : '_blank');
    }
  }

  /**
   * Activates the content conditions
   */
  async activeContentConditions(): Promise<void> {
    return await this.getConfig().activeConditions();
  }

  /**
   * Get the SDK configuration
   */
  getSdkConfig(): SDKConfig {
    return this.getInstance().getSdkConfig();
  }

  /**
   * Get the active theme
   */
  async getActivedTheme(): Promise<Theme | undefined> {
    const themes = this.getThemes() || [];
    const themeId = this.getCurrentStep()?.themeId || this.getContent()?.themeId;
    if (!themeId || themes.length === 0) {
      return undefined;
    }
    return await getActivedTheme(themes, themeId);
  }

  /**
   * Checks if theme has changed and updates theme settings if needed
   */
  protected async checkAndUpdateThemeSettings() {
    const activeTheme = await this.getActivedTheme();
    if (!activeTheme?.settings) {
      return;
    }

    // Get current theme settings from store
    const currentStore = this.getStore()?.getSnapshot();
    const currentThemeSettings = currentStore?.themeSettings;

    // Check if theme settings have changed using isEqual for deep comparison
    if (!isEqual(currentThemeSettings, activeTheme.settings)) {
      this.updateStore({
        themeSettings: activeTheme.settings,
      } as Partial<T>);
    }
  }

  /**
   * Get the base information for the store
   */
  async getStoreBaseInfo(): Promise<BaseStore | undefined> {
    const userInfo = this.getUserInfo();
    const zIndex = this.getBaseZIndex();
    const sdkConfig = this.getSdkConfig();

    const theme = await this.getActivedTheme();
    if (!theme || !theme.settings) {
      return undefined;
    }
    return {
      sdkConfig,
      assets: getAssets(theme.settings),
      globalStyle: convertToCssVars(convertSettings(theme.settings)),
      themeSettings: theme.settings,
      zIndex,
      userInfo,
      openState: false,
    };
  }

  /**
   * Checks if the content is the same as the new content
   * @param newContent - The new content to compare
   */
  isEqual(newContent: SDKContent): boolean {
    return isEqual(this.getContent(), newContent);
  }

  abstract getReusedSessionId(): string | null;
  abstract monitor(): Promise<void>;
  abstract destroy(): void;
  abstract show(cvid?: string): Promise<void>;
  abstract close(reason?: string): Promise<void>;
  abstract reset(): void;
  abstract refresh(): void;
  abstract initializeEventListeners(): void;
  abstract handleAfterShow(isNewSession?: boolean): Promise<void>;
}
