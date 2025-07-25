import {
  MESSAGE_START_FLOW_WITH_TOKEN,
  STORAGE_IDENTIFY_ANONYMOUS,
} from '@usertour-packages/constants';
import { AssetAttributes } from '@usertour-packages/frame';
import { autoStartConditions, storage } from '@usertour/helpers';
import {
  BizCompany,
  BizUserInfo,
  ContentDataType,
  PlanType,
  SDKConfig,
  SDKContent,
  ContentSession,
  SDKSettingsMode,
  Theme,
  contentEndReason,
  contentStartReason,
  BizSession,
  GetProjectSettingsResponse,
} from '@usertour/types';
import { UserTourTypes } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import ReactDOM from 'react-dom/client';
import { render } from '../components';
import { ReportEventParams } from '../types/content';
import autoBind from '../utils/auto-bind';
import {
  findTourFromUrl,
  initializeContentItems,
  findChecklistFromUrl,
  findLatestActivatedTourAndCvid,
  findLatestValidActivatedChecklist,
  isSameTour,
  getAutoStartContentSortedByPriority,
  activedContentsRulesConditions,
  hasAttributesChanged,
  isSameChecklist,
} from '../utils/content-utils';
import { getMainCss, getWsUri } from '../utils/env';
import { extensionIsRunning } from '../utils/extension';
import { document, window } from '../utils/globals';
import { on } from '../utils/listener';
import { loadCSSResource } from '../utils/loader';
import { logger } from '../utils/logger';
import { getValidMessage, sendPreviewSuccessMessage } from '../utils/postmessage';
import { Checklist } from './checklist';
import { createMockUser, DEFAULT_TARGET_MISSING_SECONDS, SESSION_TIMEOUT_HOURS } from './common';
import { Evented } from './evented';
import { Launcher } from './launcher';
import { Socket } from './socket';
import { ExternalStore } from './store';
import { Tour } from './tour';
import { checklistIsSeen, flowIsSeen } from '../utils/conditions';

interface AppStartOptions {
  environmentId?: string;
  mode: SDKSettingsMode;
  contentId?: string;
  versionId?: string;
  token: string;
}

export class App extends Evented {
  socket = new Socket({ wsUri: getWsUri() });
  activeTour: Tour | undefined;
  activeChecklist: Checklist | undefined;
  startOptions: AppStartOptions = {
    environmentId: '',
    token: '',
    mode: SDKSettingsMode.NORMAL,
  };
  sdkConfig: SDKConfig = {
    planType: PlanType.HOBBY,
    removeBranding: false,
  };
  tours: Tour[] = [];
  launchers: Launcher[] = [];
  checklists: Checklist[] = [];
  container?: HTMLDivElement;
  sessions = new Map<string, { sessionId: string; state: number }>();
  originContents?: SDKContent[];
  assets: AssetAttributes[] = [];
  userInfo: BizUserInfo | undefined;
  companyInfo: BizCompany | undefined;
  themes: Theme[] | undefined;
  stopLoop = false;
  checklistsStore = new ExternalStore<Checklist[]>([]);
  launchersStore = new ExternalStore<Launcher[]>([]);
  toursStore = new ExternalStore<Tour[]>([]);
  private baseZIndex = 1000000;
  private root: ReactDOM.Root | undefined;
  private isMonitoring = false;
  private readonly MONITOR_INTERVAL = 200;
  private lastCheck = 0;
  private sessionTimeoutHours = SESSION_TIMEOUT_HOURS;
  private targetMissingSeconds = DEFAULT_TARGET_MISSING_SECONDS;
  private customNavigate: ((url: string) => void) | null = null;

  constructor() {
    super();
    autoBind(this);
    this.initializeEventListeners();
  }

  /**
   * Sets the base z-index for UI elements
   * @param baseZIndex - The base z-index value to set
   */
  setBaseZIndex(baseZIndex: number) {
    this.baseZIndex = baseZIndex;
  }

  /**
   * Gets the current base z-index value
   * @returns The current base z-index
   */
  getBaseZIndex() {
    return this.baseZIndex;
  }

  /**
   * Sets the session timeout in hours
   * @param hours - Number of hours before a session times out
   * @throws {Error} If hours is greater than 720 (30 days)
   */
  setSessionTimeout(hours: number) {
    if (hours > 24 * 30) {
      throw new Error('Session timeout cannot exceed 30 days (720 hours)');
    }
    this.sessionTimeoutHours = hours;
  }

  /**
   * Gets the current session timeout in hours
   * @returns The current session timeout in hours
   */
  getSessionTimeout(): number {
    return this.sessionTimeoutHours;
  }

  /**
   * Sets the time allowed for target element to be missing
   * @param seconds - Time in seconds
   * @throws {Error} If seconds is greater than 10
   */
  setTargetMissingSeconds(seconds: number) {
    if (seconds > 10) {
      throw new Error('Target missing time cannot exceed 10 seconds');
    }
    this.targetMissingSeconds = seconds;
  }

  /**
   * Gets the time allowed for target element to be missing
   * @returns Time in seconds
   */
  getTargetMissingSeconds() {
    return this.targetMissingSeconds;
  }

  /**
   * Sets a custom navigation function to override default window.location.href behavior
   * @param customNavigate - Function taking a single string url parameter, or null to use default behavior
   */
  setCustomNavigate(customNavigate: ((url: string) => void) | null) {
    this.customNavigate = customNavigate;
  }

  /**
   * Gets the current custom navigation function
   * @returns The current custom navigation function or null if using default behavior
   */
  getCustomNavigate(): ((url: string) => void) | null {
    return this.customNavigate;
  }

  /**
   * Initializes DOM event listeners for the application
   */
  initializeEventListeners() {
    this.once('dom-loaded', () => {
      this.loadCss();
    });
    this.once('css-loaded', () => {
      this.createContainer();
      this.createRoot();
    });
    // refresh data when content changed in the server
    this.socket.on('content-changed', () => {
      this.fetchAndInitContent();
    });
    if (document?.readyState !== 'loading') {
      this.trigger('dom-loaded');
    } else if (document) {
      on(document, 'DOMContentLoaded', () => {
        this.trigger('dom-loaded');
      });
    }
    if (window) {
      on(window, 'message', this.handlePreviewMessage);
    }
  }

  /**
   * Handles preview messages from the builder
   * @param e - Message event containing preview data
   */
  handlePreviewMessage(e: MessageEvent) {
    const message = getValidMessage(e);
    if (!message) {
      return;
    }
    const { environmentId, contentId, idempotentKey } = message;
    const { versionId, testUser, token } = message;
    if (message.kind !== MESSAGE_START_FLOW_WITH_TOKEN) {
      return;
    }
    // send success message to builder
    sendPreviewSuccessMessage(idempotentKey);
    this.preview({
      token,
      environmentId,
      contentId,
      versionId,
      mode: SDKSettingsMode.PREVIEW,
      userId: testUser.id,
    });
  }

  /**
   * Initializes the application with the given options
   * @param startOptions - Configuration options for starting the app
   */
  init(startOptions: AppStartOptions) {
    if (!this.isPreview()) {
      this.startOptions = Object.assign({}, startOptions);
    }
  }

  async startContent(contentId: string, opts?: UserTourTypes.StartOptions) {
    const content = this.originContents?.find((content) => content.contentId === contentId);
    if (!content) {
      return;
    }
    if (content.type === ContentDataType.FLOW) {
      await this.startTour(contentId, contentStartReason.START_FROM_PROGRAM, opts);
    } else if (content.type === ContentDataType.CHECKLIST) {
      await this.startChecklist(contentId, contentStartReason.START_FROM_PROGRAM, opts);
    }
  }

  /**
   * Previews content with specified options and test user
   * @param startOptions - Preview configuration options including test user ID
   */
  async preview(startOptions: AppStartOptions & { userId: string }) {
    const { userId } = startOptions;
    this.startOptions = Object.assign({}, startOptions);
    //reset
    this.setUser(undefined);
    this.setCompany(undefined);
    this.reset();
    //start
    this.setUser(createMockUser(userId));
    this.start();
  }

  /**
   * Checks if app is in preview mode
   * @returns True if in preview mode, false otherwise
   */
  isPreview() {
    return this.startOptions.mode === SDKSettingsMode.PREVIEW;
  }

  /**
   * Determines if current user should be used
   * @returns False if in preview mode, true otherwise
   */
  useCurrentUser() {
    if (this.isPreview()) {
      return false;
    }
    return true;
  }

  /**
   * Identifies a user with the given ID and attributes
   * @param userId - External user ID
   * @param attributes - Optional user attributes
   */
  async identify(userId: string, attributes?: UserTourTypes.Attributes) {
    const { token } = this.startOptions;
    if (!token || !this.useCurrentUser()) {
      return;
    }
    const userInfo = await this.socket.upsertUser({
      userId,
      attributes,
      token,
    });
    if (!userInfo || !userInfo.externalId) {
      return;
    }
    //reset
    this.setUser(undefined);
    this.setCompany(undefined);
    this.reset();
    //start
    this.setUser(userInfo);
    this.start();
  }

  /**
   * Creates and identifies an anonymous user
   * @param attributes - Optional user attributes
   */
  async identifyAnonymous(attributes?: UserTourTypes.Attributes) {
    const key = STORAGE_IDENTIFY_ANONYMOUS;
    const storageData = storage.getLocalStorage(key) as { userId: string } | undefined;
    let userId = '';
    if (!this.useCurrentUser()) {
      return;
    }
    if (storageData?.userId) {
      userId = storageData.userId;
    } else {
      userId = uuidV4();
      storage.setLocalStorage(key, { userId });
    }
    await this.identify(userId, attributes);
  }

  /**
   * Checks if a user is identified
   * @returns True if user info exists, false otherwise
   */
  isIdentified() {
    return !!this.userInfo;
  }

  /**
   * Checks if a content has been started
   * @param contentId - The content ID to check
   * @returns True if the content has been started, false otherwise
   */
  isStarted(contentId: string) {
    if (this.activeTour?.getContent().contentId === contentId) {
      return this.activeTour.hasStarted();
    }
    if (this.activeChecklist?.getContent().contentId === contentId) {
      return this.activeChecklist.hasStarted();
    }
    return false;
  }

  /**
   * Updates user attributes
   * @param attributes - New user attributes to update
   */
  async updateUser(attributes: UserTourTypes.Attributes) {
    const { token } = this.startOptions;
    if (!token || !this.userInfo?.externalId) {
      return;
    }
    if (!this.useCurrentUser()) {
      return;
    }

    // Check if attributes have actually changed
    if (!hasAttributesChanged(this.userInfo.data, attributes)) {
      // No changes detected, skip the update
      return;
    }

    const userId = this.userInfo.externalId;
    const userInfo = await this.socket.upsertUser({
      userId,
      attributes,
      token,
    });
    if (userInfo?.externalId) {
      this.setUser(userInfo);
      await this.fetchAndInitContent();
      await this.fetchProjectSettings();
    }
  }

  /**
   * Sets user information
   * @param userInfo - User information to set
   */
  setUser(userInfo: BizUserInfo | undefined) {
    this.userInfo = userInfo ? { ...userInfo } : undefined;
  }

  /**
   * Sets company information
   * @param companyInfo - Company information to set
   */
  setCompany(companyInfo: BizCompany | undefined) {
    this.companyInfo = companyInfo ? { ...companyInfo } : undefined;
  }

  /**
   * Associates user with a company group
   * @param companyId - External company ID
   * @param attributes - Optional company attributes
   * @param opts - Optional group settings
   */
  async group(
    companyId: string,
    attributes?: UserTourTypes.Attributes,
    opts?: UserTourTypes.GroupOptions,
  ) {
    const { token } = this.startOptions;
    if (!token || !this.userInfo?.externalId) {
      return;
    }
    if (!this.useCurrentUser()) {
      return;
    }
    const userId = this.userInfo.externalId;
    const companyInfo = await this.socket.upsertCompany(
      token,
      userId,
      companyId,
      attributes,
      opts?.membership,
    );
    if (companyInfo?.externalId) {
      this.setCompany(companyInfo);
      this.fetchAndInitContent();
    }
  }

  /**
   * Updates current company group information
   * @param attributes - Optional company attributes to update
   * @param opts - Optional group settings
   */
  async updateGroup(attributes?: UserTourTypes.Attributes, opts?: UserTourTypes.GroupOptions) {
    const { token } = this.startOptions;
    if (
      !token ||
      !this.companyInfo?.externalId ||
      !this.userInfo?.externalId ||
      !this.useCurrentUser()
    ) {
      return;
    }

    // Check if attributes have actually changed
    if (!hasAttributesChanged(this.companyInfo.data, attributes)) {
      // No changes detected, skip the update
      return;
    }

    const userId = this.userInfo.externalId;
    const companyId = this.companyInfo?.externalId;
    const companyInfo = await this.socket.upsertCompany(
      token,
      userId,
      companyId,
      attributes,
      opts?.membership,
    );
    if (!companyInfo || !companyInfo.externalId) {
      return;
    }
    this.setCompany(companyInfo);
    this.fetchAndInitContent();
  }

  /**
   * Loads required CSS resources
   * @returns False if document is not available
   */
  async loadCss() {
    const cssFile = getMainCss();
    if (!document) {
      return false;
    }
    const loadMainCss = await loadCSSResource(cssFile, document);
    if (loadMainCss) {
      this.trigger('css-loaded');
    } else {
      this.trigger('css-loaded-failed');
    }
  }

  async start() {
    const userInfo = this.userInfo;
    if (!userInfo) {
      return;
    }
    await this.reset();
    await this.fetchProjectSettings();
    await this.fetchAndInitContent();
    await this.startContents();
    await this.startActivityMonitor();
  }

  getSdkConfig() {
    return this.sdkConfig;
  }

  /**
   * Fetches fresh content data from server and initializes content
   */
  async fetchAndInitContent(fetch = true) {
    if (fetch) {
      await this.fetchContents();
    }
    if (this.originContents) {
      this.initContents();
      this.syncAllStores();
    }
  }

  /**
   * Refreshes the content session
   * @param contentSession - The content session to refresh
   */
  async refreshContentSession(contentSession: ContentSession) {
    if (!this.originContents) {
      return;
    }

    const newContents = this.originContents.map((content) => {
      if (content.contentId === contentSession.contentId) {
        return {
          ...content,
          ...contentSession,
        };
      }
      return content;
    });

    this.originContents = await activedContentsRulesConditions(newContents);

    await this.fetchAndInitContent(false);
    if (this.activeChecklist) {
      await this.activeChecklist.handleItemConditions();
    }
  }
  /**
   * Reports an event to the tracking system
   * @param event - Event parameters to report
   * @param options - Optional reporting options
   */
  async reportEvent(event: ReportEventParams) {
    if (this.isPreview()) {
      return;
    }

    const { token } = this.startOptions;

    try {
      const sessionId = event.sessionId;
      if (!sessionId) {
        return;
      }

      const contentSession = await this.socket.trackEvent({
        userId: event.userId,
        token,
        sessionId,
        eventData: event.eventData,
        eventName: event.eventName,
      });

      if (contentSession) {
        await this.refreshContentSession(contentSession);
      }
    } catch (error) {
      logger.error('Failed to report event:', error);
    }
  }

  /**
   * Creates a session for a content
   * @param contentId - The content ID to create a session for
   * @returns The session ID if successful
   */
  async createSession(contentId: string): Promise<BizSession | null> {
    const { token } = this.startOptions;
    const userId = this.userInfo?.externalId;
    const companyId = this.companyInfo?.externalId;
    if (!userId || !token) {
      return null;
    }
    const result = await this.socket.createSession({
      userId,
      contentId,
      token,
      companyId,
    });
    if (result) {
      await this.refreshContentSession(result.contentSession);
      return result.session;
    }
    return null;
  }

  /**
   * Creates the container element for the widget
   */
  createContainer() {
    if (!document) {
      logger.error('Document not found!');
      return;
    }

    const containerId = 'usertour-widget';
    let container = document.getElementById(containerId) as HTMLDivElement;

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    this.container = container;
    this.trigger('container-created');
  }

  /**
   * Removes the container element from DOM
   */
  unmountContainer() {
    if (this.container) {
      this.container.parentNode?.removeChild(this.container);
    }
  }

  /**
   * Initializes content data based on current settings
   */
  async fetchContents() {
    // Validate required params
    if (!this.validateInitParams()) {
      this.originContents = undefined;
      return;
    }

    const { token, contentId, versionId, mode } = this.startOptions;
    const params = {
      token,
      contentId,
      versionId,
      mode,
      userId: this.userInfo!.externalId,
      companyId: this.companyInfo?.externalId,
    };

    // Fetch content data
    const data = await this.socket.listContents(params);

    // Validate response and mode
    if (!data || this.startOptions.mode !== mode) {
      this.originContents = undefined;
      logger.error('Failed to fetch content data');
      return;
    }

    // Filter contents based on version or content ID
    let contents = this.filterContents(data);

    // Handle preview mode
    if (contents && this.isPreview()) {
      contents = contents.map((content) => ({
        ...content,
        config: { ...autoStartConditions },
      }));
    }

    this.originContents = contents;
  }

  // Helper methods
  private validateInitParams(): boolean {
    const { token } = this.startOptions;
    return !!(this.userInfo && token);
  }

  private filterContents(data: SDKContent[]): SDKContent[] {
    const { versionId, contentId } = this.startOptions;

    if (versionId) {
      return data.filter((content) => content.id === versionId);
    }

    if (contentId) {
      return data.filter((content) => content.contentId === contentId);
    }

    return data;
  }

  /**
   * Starts a checklist with given content ID and reason
   * @param contentId - Optional content ID to start specific checklist
   * @param reason - Reason for starting the checklist
   * @param opts - Optional start options
   */
  async startChecklist(
    contentId?: string,
    reason: string = contentStartReason.START_CONDITION,
    opts?: UserTourTypes.StartOptions,
  ) {
    try {
      // If the app is not ready, do nothing
      if (!this.isReady()) {
        return;
      }

      // Start URL-based checklist first
      const checklistFromUrl = findChecklistFromUrl(this.checklists);
      if (await this.startUrlChecklist(checklistFromUrl)) {
        return;
      }

      // Start specific checklist by contentId
      if (contentId) {
        await this.startSpecificChecklist(contentId, reason, opts);
        return;
      }

      // Start latest activated checklist
      if (await this.startLatestActivatedChecklist()) {
        return;
      }

      // Start highest priority checklist
      await this.startHighestPriorityChecklist(reason);
    } catch (error) {
      logger.error('Failed to start checklist:', error);
    }
  }

  /**
   * Starts URL-based checklist
   * @returns true if checklist was started, false otherwise
   */
  private async startUrlChecklist(checklistFromUrl: Checklist | undefined): Promise<boolean> {
    if (
      !checklistFromUrl ||
      checklistFromUrl.hasDismissed() ||
      isSameChecklist(checklistFromUrl, this.activeChecklist)
    ) {
      return false;
    }

    if (this.activeChecklist) {
      await this.activeChecklist.close(contentEndReason.URL_START_CLOSED);
    }

    this.activeChecklist = checklistFromUrl;
    await this.activeChecklist.start(contentStartReason.START_FROM_URL);
    return true;
  }

  /**
   * Starts a specific checklist by contentId
   */
  private async startSpecificChecklist(
    contentId: string,
    reason: string,
    opts?: UserTourTypes.StartOptions,
  ): Promise<void> {
    const activeChecklist = this.checklists.find(
      (checklist) => checklist.getContent().contentId === contentId,
    );
    if (!activeChecklist || isSameChecklist(activeChecklist, this.activeChecklist)) {
      return;
    }

    if (opts?.once && checklistIsSeen(activeChecklist.getContent().latestSession)) {
      return;
    }

    if (this.activeChecklist) {
      await this.activeChecklist.close(contentEndReason.USER_STARTED_OTHER_CONTENT);
    }

    this.activeChecklist = activeChecklist;
    if (!opts?.continue) {
      await this.activeChecklist.endLatestSession(contentEndReason.USER_STARTED_OTHER_CONTENT);
    }
    await this.activeChecklist.start(reason);
  }

  /**
   * Starts latest activated checklist
   * @returns true if checklist was started, false otherwise
   */
  private async startLatestActivatedChecklist(): Promise<boolean> {
    if (this.activeChecklist) {
      return false;
    }

    const latestActivatedChecklist = findLatestValidActivatedChecklist(
      this.checklists.filter((checklist) => !checklist.isTemporarilyHidden()),
    );

    if (latestActivatedChecklist) {
      this.activeChecklist = latestActivatedChecklist;
      await this.activeChecklist.start(contentStartReason.START_FROM_SESSION);
      return true;
    }

    return false;
  }

  /**
   * Starts the highest priority checklist based on auto-start conditions and priority settings
   * @param reason - The reason for starting the checklist
   * @returns Promise that resolves when the checklist is started or rejected if no eligible checklist is found
   */
  private async startHighestPriorityChecklist(reason: string): Promise<void> {
    // Early return if there's already an active checklist
    if (this.activeChecklist) {
      return;
    }

    try {
      // Get auto-start eligible checklists sorted by priority and take the first one
      const sortedChecklists = getAutoStartContentSortedByPriority(this.checklists);
      const highestPriorityChecklist = sortedChecklists[0];

      if (!highestPriorityChecklist) {
        return;
      }

      // Set as active checklist and start it
      this.activeChecklist = highestPriorityChecklist;
      await this.activeChecklist.autoStart(reason);
    } catch (error) {
      logger.error('Failed to start highest priority checklist:', error);
      // Reset active checklist on error to prevent stuck state
      this.activeChecklist = undefined;
    }
  }

  /**
   * Starts all registered launchers that can auto-start, sorted by priority
   */
  async startLauncher() {
    // If the app is not ready, do nothing
    if (!this.isReady()) {
      return;
    }

    try {
      // Get all auto-start eligible launchers sorted by priority
      const sortedLaunchers = getAutoStartContentSortedByPriority(this.launchers);

      // Early return if no eligible launchers found
      if (!sortedLaunchers.length) {
        return;
      }

      // Start all eligible launchers in priority order
      for (const launcher of sortedLaunchers) {
        await launcher.autoStart();
      }
    } catch (error) {
      logger.error('Failed to start launchers:', error);
    }
  }

  /**
   * Starts a tour with given content ID and reason
   * @param contentId - Optional content ID to start specific tour
   * @param reason - Reason for starting the tour
   * @param opts - Optional start options
   */
  async startTour(
    contentId: string | undefined,
    reason: string,
    opts?: UserTourTypes.StartOptions,
  ) {
    try {
      // If the app is not ready, do nothing
      if (!this.isReady()) {
        return;
      }

      // Start URL-based tour
      const urlTour = findTourFromUrl(this.tours);
      if (await this.startUrlTour(urlTour)) {
        return;
      }

      // Start specific tour by contentId
      if (contentId) {
        await this.startSpecificTour(contentId, reason, opts);
        return;
      }

      // Start latest activated tour
      if (await this.startLatestActivatedTour()) {
        return;
      }

      // Start highest priority tour
      await this.startHighestPriorityTour(reason);
    } catch (error) {
      logger.error('Failed to start tour:', error);
    }
  }

  /**
   * Starts URL-based tour
   * @returns true if tour was started, false otherwise
   */
  private async startUrlTour(urlTour: Tour | undefined): Promise<boolean> {
    if (!urlTour || urlTour.hasDismissed() || isSameTour(urlTour, this.activeTour)) {
      return false;
    }

    if (this.activeTour) {
      await this.activeTour.close(contentEndReason.URL_START_CLOSED);
    }
    const contentId = urlTour.getContent().contentId;

    const latestActivatedTourAndCvid = findLatestActivatedTourAndCvid(this.tours, contentId);
    const latestActivatedTour = latestActivatedTourAndCvid?.latestActivatedTour;
    const cvid = latestActivatedTourAndCvid?.cvid;

    if (isSameTour(urlTour, latestActivatedTour)) {
      this.activeTour = latestActivatedTour;
      await this.activeTour?.start(contentStartReason.START_FROM_SESSION, cvid);
    } else {
      this.activeTour = urlTour;
      await this.activeTour.start(contentStartReason.START_FROM_URL);
    }

    return true;
  }

  /**
   * Starts a specific tour by contentId
   * @param contentId - The content ID of the tour to start
   * @param reason - Reason for starting the tour
   * @param opts - Optional start options
   */
  private async startSpecificTour(
    contentId: string,
    reason: string,
    opts?: UserTourTypes.StartOptions,
  ): Promise<void> {
    const activeTour = this.tours.find((tour) => tour.getContent().contentId === contentId);
    if (!activeTour || isSameTour(activeTour, this.activeTour)) {
      return;
    }

    if (opts?.once && flowIsSeen(activeTour.getContent().latestSession)) {
      return;
    }

    if (this.activeTour) {
      await this.activeTour.close(contentEndReason.USER_STARTED_OTHER_CONTENT);
    }

    const latestActivatedTourAndCvid = findLatestActivatedTourAndCvid(this.tours, contentId);
    const latestActivatedTour = latestActivatedTourAndCvid?.latestActivatedTour;
    const cvid = opts?.cvid;

    if (isSameTour(activeTour, latestActivatedTour)) {
      if (opts?.continue) {
        this.activeTour = latestActivatedTour;
        const continueCvid = latestActivatedTourAndCvid?.cvid;
        await this.activeTour?.start(contentStartReason.START_FROM_SESSION, continueCvid);
      } else {
        this.activeTour = latestActivatedTour;
        await this.activeTour?.endLatestSession(contentEndReason.USER_STARTED_OTHER_CONTENT);
        await this.activeTour?.start(reason, cvid);
      }
    } else {
      this.activeTour = activeTour;
      await this.activeTour.start(reason, cvid);
    }
  }

  /**
   * Starts latest activated tour
   * @returns true if tour was started, false otherwise
   */
  private async startLatestActivatedTour(): Promise<boolean> {
    if (this.activeTour) {
      return false;
    }

    const latestActivatedTourAndCvid = findLatestActivatedTourAndCvid(
      this.tours.filter((tour) => !tour.isTemporarilyHidden()),
    );
    const latestActivatedTour = latestActivatedTourAndCvid?.latestActivatedTour;
    const cvid = latestActivatedTourAndCvid?.cvid;

    if (latestActivatedTour) {
      this.activeTour = latestActivatedTour;
      await this.activeTour.start(contentStartReason.START_FROM_SESSION, cvid);
      return true;
    }

    return false;
  }

  /**
   * Starts the highest priority tour based on auto-start conditions and priority settings
   * @param reason - The reason for starting the tour
   * @returns Promise that resolves when the tour is started or rejected if no eligible tour is found
   */
  private async startHighestPriorityTour(reason: string): Promise<void> {
    // Early return if there's already an active tour
    if (this.activeTour) {
      return;
    }

    try {
      // Get auto-start eligible tours sorted by priority and take the first one
      const sortedTours = getAutoStartContentSortedByPriority(this.tours);
      const highestPriorityTour = sortedTours[0];

      if (!highestPriorityTour) {
        return;
      }

      // Set as active tour and start it
      this.activeTour = highestPriorityTour;
      await this.activeTour.autoStart(reason);
    } catch (error) {
      logger.error('Failed to start highest priority tour:', error);
      // Reset active tour on error to prevent stuck state
      this.activeTour = undefined;
    }
  }

  /**
   * Closes the currently active checklist
   */
  closeActiveChecklist() {
    if (this.activeChecklist) {
      this.activeChecklist.close();
    }
  }

  /**
   * Unsets the active checklist reference
   */
  unsetActiveChecklist() {
    if (this.activeChecklist) {
      this.activeChecklist = undefined;
    }
  }

  /**
   * Closes the currently active tour
   * @param reason - Optional reason for closing the tour
   */
  async closeActiveTour(reason?: contentEndReason) {
    if (this.activeTour) {
      await this.activeTour.close(reason);
    }
  }

  /**
   * Unsets the active tour reference
   */
  unsetActiveTour() {
    if (this.activeTour) {
      this.activeTour = undefined;
    }
  }

  /**
   * Fetches project settings from server
   */
  async fetchProjectSettings() {
    const { token } = this.startOptions;
    if (!token) {
      return;
    }
    const params = {
      token,
      userId: this.userInfo?.externalId,
      companyId: this.companyInfo?.externalId,
    };
    const data: GetProjectSettingsResponse | null = await this.socket.getProjectSettings(params);
    if (data) {
      this.sdkConfig = data.config;
      this.themes = data.themes;
    } else {
      logger.error('Failed to fetch project settings!');
    }
  }

  /**
   * Creates and initializes React root element
   */
  async createRoot() {
    if (!this.container) {
      return;
    }
    if (!this.root) {
      this.root = ReactDOM.createRoot(this.container) as ReactDOM.Root;
    }
    return await render(this.root, {
      toursStore: this.toursStore,
      launchersStore: this.launchersStore,
      checklistsStore: this.checklistsStore,
    });
  }

  /**
   * Checks if the app is ready to start
   * @returns true if the app is ready to start, false otherwise
   */
  isReady() {
    return this.container && this.root && this.userInfo?.externalId;
  }

  /**
   * Starts the activity monitor to track user interactions
   */
  async startActivityMonitor() {
    let rafId: number;

    const handleUserActivity = async () => {
      if (this.stopLoop) return;

      const now = Date.now();
      if (now - this.lastCheck >= this.MONITOR_INTERVAL) {
        this.lastCheck = now;
        await this.executeMonitor();
      }
    };

    const monitor = () => {
      if (this.stopLoop) {
        cancelAnimationFrame(rafId);
        return;
      }
      handleUserActivity();
      rafId = requestAnimationFrame(monitor);
    };

    monitor();
    handleUserActivity();
  }

  private async executeMonitor(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    try {
      this.isMonitoring = true;

      if (!this.originContents) {
        return;
      }
      if (extensionIsRunning()) {
        this.endAll();
        return;
      }

      // Execute all monitoring tasks in parallel using Promise.all
      await Promise.all([
        ...this.tours.map((tour) => tour.monitor()),
        ...this.launchers.map((launcher) => launcher.monitor()),
        ...this.checklists.map((checklist) => checklist.monitor()),
      ]);

      await this.startContents();
    } catch (error) {
      logger.error('Error in app monitoring:', error);
    } finally {
      this.isMonitoring = false;
    }
  }

  /**
   * Starts all content items (tours, launchers, checklists)
   */
  async startContents() {
    await this.startTour(undefined, contentStartReason.START_CONDITION);
    await this.startLauncher();
    await this.startChecklist();
  }

  /**
   * Initializes all content types
   */
  private initContents() {
    this.initChecklists();
    this.initLauncher();
    this.initTours();
  }

  /**
   * Initializes checklist items
   */
  private initChecklists() {
    if (!this.originContents) {
      return;
    }
    this.checklists = initializeContentItems(
      this.originContents,
      this.checklists,
      ContentDataType.CHECKLIST,
      (content) => new Checklist(this, content),
    );
  }

  /**
   * Initializes launcher items
   */
  private initLauncher() {
    if (!this.originContents) {
      return;
    }
    this.launchers = initializeContentItems(
      this.originContents,
      this.launchers,
      ContentDataType.LAUNCHER,
      (content) => new Launcher(this, content),
    );
  }

  /**
   * Initializes tour items
   */
  private initTours() {
    if (!this.originContents) {
      return;
    }
    this.tours = initializeContentItems(
      this.originContents,
      this.tours,
      ContentDataType.FLOW,
      (content) => new Tour(this, content),
    );
  }

  /**
   * Synchronizes all stores with current data
   */
  private syncAllStores() {
    this.syncToursStore();
    this.syncLaunchersStore();
    this.syncChecklistsStore();
  }

  /**
   * Synchronizes tours store
   */
  private syncToursStore() {
    this.toursStore.setData([...this.tours]);
  }

  /**
   * Synchronizes launchers store
   */
  private syncLaunchersStore() {
    this.launchersStore.setData([...this.launchers]);
  }

  /**
   * Synchronizes checklists store
   */
  private syncChecklistsStore() {
    this.checklistsStore.setData([...this.checklists]);
  }

  /**
   * Resets the application state
   */
  async reset() {
    this.stopLoop = false;
    this.originContents = undefined;
    this.isMonitoring = false;
    this.tours = [];
    await this.closeActiveTour();
    this.closeActiveChecklist();
  }

  /**
   * Ends all active content and resets the application
   */
  async endAll() {
    this.userInfo = undefined;
    this.companyInfo = undefined;
    await this.reset();
    this.stopLoop = true;
  }
}
