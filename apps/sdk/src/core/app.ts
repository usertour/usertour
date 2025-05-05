import { MESSAGE_START_FLOW_WITH_TOKEN, STORAGE_IDENTIFY_ANONYMOUS } from '@usertour-ui/constants';
import { AssetAttributes } from '@usertour-ui/frame';
import { autoStartConditions, storage } from '@usertour-ui/shared-utils';
import {
  BizCompany,
  BizUserInfo,
  ContentDataType,
  PlanType,
  SDKConfig,
  SDKContent,
  SDKSettingsMode,
  Theme,
  flowEndReason,
  flowStartReason,
} from '@usertour-ui/types';
import { UserTourTypes } from '@usertour-ui/types';
import { uuidV4 } from '@usertour-ui/ui-utils';
import ReactDOM from 'react-dom/client';
import { render } from '../components';
import { ReportEventOptions, ReportEventParams } from '../types/content';
import autoBind from '../utils/auto-bind';
import { compareContentPriorities } from '../utils/content';
import { initializeContentItems } from '../utils/content-utils';
import { getMainCss, getWsUri } from '../utils/env';
import { AppEvents } from '../utils/event';
import { extensionIsRunning } from '../utils/extension';
import { document, window } from '../utils/globals';
import { on } from '../utils/listener';
import { loadCSSResource } from '../utils/loader';
import { logger } from '../utils/logger';
import { getValidMessage, sendPreviewSuccessMessage } from '../utils/postmessage';
import { Checklist } from './checklist';
import { createMockUser } from './common';
import { Evented } from './evented';
import { Launcher } from './launcher';
import { Socket } from './socket';
import { ExternalStore } from './store';
import { Tour } from './tour';

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
  private contentPollingInterval: number | undefined;
  private readonly CONTENT_POLLING_INTERVAL = 10000; // 10 seconds

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

    this.on(AppEvents.EVENT_REPORTED, () => {
      this.refresh();
    });
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
    const userId = this.userInfo.externalId;
    const userInfo = await this.socket.upsertUser({
      userId,
      attributes,
      token,
    });
    if (userInfo?.externalId) {
      this.setUser(userInfo);
      this.refresh();
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
      this.refresh();
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
    this.refresh();
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
    await this.initSdkConfig();
    await this.initThemeData();
    await this.initContentData();
    this.initContents();
    this.syncAllStores();
    await this.startContents();
    await this.startActivityMonitor();
    this.startContentPolling();
  }

  getSdkConfig() {
    return this.sdkConfig;
  }

  async refresh() {
    await this.initContentData();
    if (this.originContents) {
      this.initContents();
      this.syncAllStores();
    }
  }

  /**
   * Reports an event to the tracking system
   * @param event - Event parameters to report
   * @param options - Optional reporting options
   */
  async reportEvent(event: ReportEventParams, options: ReportEventOptions = {}) {
    if (this.isPreview()) {
      return;
    }

    const { token } = this.startOptions;

    try {
      const sessionId = event.sessionId || (await this.handleSession(event, options));
      if (!sessionId) {
        return;
      }

      await this.socket.trackEvent({
        userId: event.userId,
        token,
        sessionId,
        eventData: event.eventData,
        eventName: event.eventName,
      });
      this.trigger(AppEvents.EVENT_REPORTED);
    } catch (error) {
      logger.error('Failed to report event:', error);
    }
  }

  /**
   * Handles session management for event reporting
   * @param event - Event parameters
   * @param options - Session options
   * @returns Session ID if successful
   */
  private async handleSession(
    event: ReportEventParams,
    options: ReportEventOptions,
  ): Promise<string | undefined> {
    const { contentId } = event;
    const { isCreateSession = false, isDeleteSession = false } = options;

    let sessionId = this.sessions.get(contentId)?.sessionId;

    if (isCreateSession) {
      const session = await this.createSession(contentId);
      if (!session) {
        logger.error('Failed to create user session.');
        return;
      }

      this.sessions.set(contentId, { sessionId: session.id, state: 0 });
      sessionId = session.id;
    }

    if (isDeleteSession) {
      this.sessions.delete(contentId);
    }

    return sessionId;
  }

  async createSession(contentId: string) {
    const { token } = this.startOptions;
    const userId = this.userInfo?.externalId;
    if (!userId || !token) {
      return;
    }
    return await this.socket.createSession({
      userId,
      contentId,
      token,
    });
  }

  /**
   * Creates the container element for the widget
   */
  createContainer() {
    if (!document) {
      logger.error("Can't find document!");
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
  async initContentData() {
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
   * Starts all registered checklists
   */
  async startChecklist() {
    const sortedChecklists = this.checklists
      .filter((checklist) => checklist.canAutoStart())
      .sort((a, b) => compareContentPriorities(a, b));

    for (const checklist of sortedChecklists) {
      checklist.autoStart();
    }
  }

  /**
   * Starts all registered launchers
   */
  async startLauncher() {
    const sortedLaunchers = this.launchers
      .filter((launcher) => launcher.canAutoStart())
      .sort((a, b) => compareContentPriorities(a, b));

    for (const launcher of sortedLaunchers) {
      launcher.autoStart();
    }
  }

  /**
   * Starts a tour with given content ID and reason
   * @param contentId - Optional content ID to start specific tour
   * @param reason - Reason for starting the tour
   */
  async startTour(contentId: string | undefined, reason: string) {
    const userInfo = this.userInfo;
    if (this.activeTour || !userInfo?.externalId) {
      return;
    }

    const autoStartTours = this.tours
      .filter((tour) => tour.canAutoStart())
      .sort((a, b) => compareContentPriorities(a, b));
    const activeTour = contentId
      ? this.tours.find((tour) => tour.getContent().contentId === contentId)
      : autoStartTours[0];

    if (!activeTour) {
      return;
    }

    this.activeTour = activeTour;
    if (contentId) {
      this.activeTour.start(reason);
    } else {
      this.activeTour.autoStart(reason);
    }
  }

  /**
   * Closes the currently active tour
   * @param reason - Optional reason for closing the tour
   */
  async closeActiveTour(reason?: flowEndReason) {
    if (this.activeTour) {
      await this.activeTour.close(reason);
      this.activeTour = undefined;
    }
  }

  /**
   * Cancels and destroys the active tour
   */
  async cancelActiveTour() {
    if (this.activeTour) {
      this.activeTour.destroy();
      this.activeTour = undefined;
    }
  }

  async initSdkConfig() {
    const sdkConfig = await this.socket.getConfig(this.startOptions.token);
    if (sdkConfig) {
      this.sdkConfig = sdkConfig;
      console.log('sdkConfig', this.sdkConfig);
    }
  }

  /**
   * Initializes theme data from server
   */
  async initThemeData() {
    const { token } = this.startOptions;
    const data = await this.socket.listThemes({ token });
    if (data) {
      this.themes = data;
    } else {
      logger.error('list themes error !');
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
   * Starts the activity monitor to track user interactions
   */
  async startActivityMonitor() {
    let rafId: number;
    let lastCheck = 0;
    const CHECK_INTERVAL = 200;

    const handleUserActivity = () => {
      if (this.stopLoop) return;

      const now = Date.now();
      if (now - lastCheck >= CHECK_INTERVAL) {
        lastCheck = now;
        this.monitor();
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

  /**
   * Monitors and activates content conditions
   */
  async monitor() {
    if (!this.originContents) {
      return;
    }
    if (extensionIsRunning()) {
      this.endAll();
      return;
    }

    //active conditions
    for (const tour of this.tours) {
      tour.monitor();
    }
    for (const launcher of this.launchers) {
      launcher.monitor();
    }
    for (const checklist of this.checklists) {
      checklist.monitor();
    }

    this.startContents();
  }

  /**
   * Resets the application state
   */
  async reset() {
    this.stopLoop = false;
    this.originContents = undefined;
    this.tours = [];
    this.stopContentPolling();
    await this.closeActiveTour();
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

  /**
   * Starts all content items (tours, launchers, checklists)
   */
  async startContents() {
    await this.startTour(undefined, flowStartReason.START_CONDITION);
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
   * Starts polling for content updates
   */
  private startContentPolling() {
    // Clear any existing interval
    if (this.contentPollingInterval) {
      clearInterval(this.contentPollingInterval);
    }

    // Set up new polling interval
    this.contentPollingInterval = window?.setInterval(async () => {
      this.refresh();
    }, this.CONTENT_POLLING_INTERVAL);
  }

  /**
   * Stops content polling
   */
  private stopContentPolling() {
    if (this.contentPollingInterval) {
      clearInterval(this.contentPollingInterval);
      this.contentPollingInterval = undefined;
    }
  }
}
