import { convertSettings } from '@usertour-ui/shared-utils';
import { convertToCssVars } from '@usertour-ui/shared-utils';
import {
  EventAttributes,
  SDKContent,
  Step,
  Theme,
  UserTourTypes,
  contentStartReason,
} from '@usertour-ui/types';
import { isEqual } from 'lodash';
import { ReportEventOptions, ReportEventParams } from '../types/content';
import autoBind from '../utils/auto-bind';
import { findLatestEvent, isValidContent } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { window } from '../utils/globals';
import { buildNavigateUrl } from '../utils/navigate-utils';
import { App } from './app';
import { getAssets } from './common';
import { Config } from './config';
import { Evented } from './evented';
import { ExternalStore } from './store';
import { differenceInHours } from 'date-fns';

export abstract class BaseContent<T = any> extends Evented {
  private readonly instance: App;
  private content: SDKContent;
  private readonly store: ExternalStore<T>;
  private readonly config: Config;
  private isDismissed = false;
  private isStarted = false;
  private sessionId = '';
  private currentStep?: Step | null;
  constructor(instance: App, content: SDKContent, defaultStore: T) {
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
    // let reusedSessionId: string | null;
    const reusedSessionId = this.getReusedSessionId();
    // if (reusedSessionId && this.sessionIsTimeout()) {
    //   this.sessionId = reusedSessionId;
    //   await this.endSession(contentEndReason.SESSION_TIMEOUT);
    //   reusedSessionId = null;
    //   this.sessionId = '';
    // }
    const sessionId = reusedSessionId || (await this.createSessionId());
    if (!sessionId) {
      throw new Error('Failed to create user session.');
    }
    this.sessionId = sessionId;
    this.setStarted(true);
    this.trigger(AppEvents.CONTENT_AUTO_START_ACTIVATED, { reason });
    this.show(cvid);
  }

  /**
   * Checks if the content can auto start
   * @returns {boolean} True if the content can auto start, false otherwise
   */
  canAutoStart() {
    return !this.hasDismissed() && this.isAutoStart() && this.isValid() && this.hasContainer();
  }

  /**
   * Checks if the content has been dismissed
   * @returns {boolean} True if the content has been dismissed, false otherwise
   */
  hasDismissed() {
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
  setStore(store: T) {
    this.store.setData(store);
  }

  /**
   * Open the store
   */
  open() {
    this.updateStore({ openState: true } as unknown as Partial<T>);
  }

  /**
   * Hide the store
   */
  hide() {
    this.updateStore({ openState: false } as unknown as Partial<T>);
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
  startTour(contentId: string | undefined, reason: string) {
    return this.getInstance().startTour(contentId, reason);
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
   * @returns {Promise<string>} A promise that resolves to the new session ID
   */
  async createSessionId() {
    const session = await this.getInstance().createSession(this.getContent().contentId);
    return session?.id;
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
   * Reports an event with the given parameters
   * @param event - The event to report
   * @param options - The options for the event
   * @returns {Promise<void>} A promise that resolves when the event is reported
   */
  private async reportEvent(event: Partial<ReportEventParams>, options: ReportEventOptions = {}) {
    const userInfo = this.getUserInfo();
    const content = this.getContent();
    const { externalId: userId } = userInfo || {};
    const { contentId } = content;
    const { eventName, eventData, sessionId } = event;

    // Early return if required fields are missing
    if (!userId || !contentId || !eventName || !eventData) {
      return;
    }

    const reportEvent: ReportEventParams = {
      eventData: {
        ...eventData,
        [EventAttributes.PAGE_URL]: window?.location?.href,
        [EventAttributes.VIEWPORT_WIDTH]: window?.innerWidth,
        [EventAttributes.VIEWPORT_HEIGHT]: window?.innerHeight,
      },
      eventName,
      contentId,
      userId,
      sessionId,
    };

    return await this.getInstance().reportEvent(reportEvent, options);
  }

  async reportEventWithSession(
    event: Partial<ReportEventParams>,
    options: ReportEventOptions = {},
  ) {
    const sessionId = event.sessionId || this.getSessionId();
    if (!sessionId) {
      return;
    }
    await this.reportEvent(
      {
        ...event,
        sessionId,
      },
      options,
    );
  }

  /**
   * Get the company information
   * @returns {Object} The company information
   */
  getCompanyInfo() {
    return this.getInstance().companyInfo;
  }

  /**
   * Unsets the active tour
   * @returns {Promise<void>} A promise that resolves when the active tour is unset
   */
  unsetActiveTour() {
    return this.getInstance().unsetActiveTour();
  }

  /**
   * Unsets the active checklist
   * @returns {Promise<void>} A promise that resolves when the active checklist is unset
   */
  unsetActiveChecklist() {
    return this.getInstance().unsetActiveChecklist();
  }

  /**
   * Get the active checklist
   * @returns {Object} The active checklist
   */
  getActiveChecklist() {
    return this.getInstance().activeChecklist;
  }

  /**
   * Starts a new tour
   * @param contentId - The ID of the content to start
   * @returns {Promise<void>} A promise that resolves when the new tour is started
   */
  async startNewTour(contentId: string) {
    await this.startTour(contentId, contentStartReason.ACTION);
  }

  /**
   * Handles the navigation
   * @param data - The data to navigate
   */
  handleNavigate(data: any) {
    const userInfo = this.getUserInfo();
    const url = buildNavigateUrl(data.value, userInfo);
    window?.top?.open(url, data.openType === 'same' ? '_self' : '_blank');
  }

  /**
   * Activates the content conditions
   * @returns {Promise<void>} A promise that resolves when the content conditions are activated
   */
  async activeContentConditions() {
    return await this.getConfig().activeConditions();
  }

  /**
   * Get the SDK configuration
   * @returns {Object} The SDK configuration
   */
  getSdkConfig() {
    return this.getInstance().getSdkConfig();
  }

  /**
   * Get the base information for the store
   * @returns {Object} The base information for the store
   */
  getStoreBaseInfo() {
    const themes = this.getThemes();
    const userInfo = this.getUserInfo();
    const zIndex = this.getBaseZIndex();
    const sdkConfig = this.getSdkConfig();
    if (!themes || themes.length === 0) {
      return {};
    }
    let theme: Theme | undefined;
    const currentStep = this.getCurrentStep();
    if (currentStep?.themeId) {
      theme = themes.find((item) => item.id === currentStep?.themeId);
    } else {
      theme = themes.find((item) => this.getContent()?.themeId === item.id);
    }
    if (!theme) {
      return {};
    }
    return {
      sdkConfig,
      assets: getAssets(theme),
      globalStyle: convertToCssVars(convertSettings(theme.settings)),
      theme,
      zIndex,
      userInfo,
    };
  }

  /**
   * Refreshes the app contents
   * @returns {Promise<void>} A promise that resolves when the app contents are refreshed
   */
  async refreshContents() {
    await this.getInstance().refresh();
  }

  /**
   * Checks if the content is the same as the new content
   * @param newContent - The new content to compare
   * @returns {boolean} True if the content is the same, false otherwise
   */
  isEqual(newContent: SDKContent) {
    return isEqual(this.getContent(), newContent);
  }

  abstract getReusedSessionId(): string | null;
  abstract monitor(): Promise<void>;
  abstract destroy(): void;
  abstract show(cvid?: string): void;
  abstract close(reason?: string): Promise<void>;
  abstract reset(): void;
  abstract refresh(): void;
  abstract initializeEventListeners(): void;
}
