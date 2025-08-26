import {
  MESSAGE_START_FLOW_WITH_TOKEN,
  SDK_CSS_LOADED,
  SDK_CSS_LOADED_FAILED,
  SDK_DOM_LOADED,
  STORAGE_IDENTIFY_ANONYMOUS,
  SDK_CONTAINER_CREATED,
} from '@usertour-packages/constants';
import { AssetAttributes } from '@usertour-packages/frame';
import { storage, uuidV4 } from '@usertour/helpers';
import {
  BizCompany,
  BizUserInfo,
  PlanType,
  RulesCondition,
  SDKConfig,
  SDKContent,
  SDKSettingsMode,
} from '@usertour/types';
import { UserTourTypes } from '@usertour/types';
import ReactDOM from 'react-dom/client';
import { render } from '@/components';
import { Evented } from '@/utils/evented';
import { ExternalStore } from '@/utils/store';
import { UsertourTour } from '@/core/usertour-tour';
import { UsertourSession } from '@/core/usertour-session';
import { UsertourSocket } from '@/core/usertour-socket';
import {
  ConditionStateChangeEvent,
  UsertourConditionsMonitor,
} from '@/core/usertour-conditions-monitor';
import {
  autoBind,
  document,
  window,
  on,
  loadCSSResource,
  logger,
  getValidMessage,
  sendPreviewSuccessMessage,
  timerManager,
} from '@/utils';
import { buildNavigateUrl, hasAttributesChanged, createMockUser } from '@/core/usertour-helper';
import { getMainCss, getWsUri } from '@/core/usertour-env';
import { WebSocketEvents, ErrorMessages, SDKContentSession, TrackCondition } from '@/types';

interface AppStartOptions {
  environmentId?: string;
  mode: SDKSettingsMode;
  contentId?: string;
  versionId?: string;
  token: string;
}

export class UsertourCore extends Evented {
  socketService: UsertourSocket;
  activeTour: UsertourTour | undefined;
  startOptions: AppStartOptions = {
    environmentId: '',
    token: '',
    mode: SDKSettingsMode.NORMAL,
  };
  sdkConfig: SDKConfig = {
    planType: PlanType.HOBBY,
    removeBranding: false,
  };
  tours: UsertourTour[] = [];
  container?: HTMLDivElement;
  assets: AssetAttributes[] = [];
  userInfo: BizUserInfo | undefined;
  companyInfo: BizCompany | undefined;
  toursStore = new ExternalStore<UsertourTour[]>([]);
  private baseZIndex = 1000000;
  private root: ReactDOM.Root | undefined;
  private targetMissingSeconds = 6;
  private customNavigate: ((url: string) => void) | null = null;
  private readonly id: string;

  // Condition monitoring
  private conditionsMonitor: UsertourConditionsMonitor | null = null;

  constructor() {
    super();
    autoBind(this);
    this.socketService = new UsertourSocket();
    this.id = uuidV4();
    this.initializeEventListeners();
    this.initializeConditionsMonitor();
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
   * Gets the current user info
   * @returns The current user info
   */
  getUserInfo() {
    return this.userInfo;
  }

  /**
   * Initializes DOM event listeners for the application
   */
  initializeEventListeners() {
    this.once(SDK_DOM_LOADED, () => {
      this.loadCss();
    });
    this.once(SDK_CSS_LOADED, () => {
      this.createContainer();
      this.createRoot();
    });
    if (document?.readyState !== 'loading') {
      this.trigger(SDK_DOM_LOADED);
    } else if (document) {
      on(document, 'DOMContentLoaded', () => {
        this.trigger(SDK_DOM_LOADED);
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

  /**
   * Previews content with specified options and test user
   * @param startOptions - Preview configuration options including test user ID
   */
  async preview(startOptions: AppStartOptions & { userId: string }) {
    const { userId } = startOptions;
    this.startOptions = Object.assign({}, startOptions);
    //reset
    this.reset();
    //start
    this.setUser(createMockUser(userId));
  }

  async startContent(contentId: string, opts?: UserTourTypes.StartOptions) {
    console.log('startContent', contentId, opts);
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
      console.log('startTour', contentId, reason, opts);
    } catch (error) {
      logger.error('Failed to start tour:', error);
    }
  }

  /**
   * Handles the navigation
   * @param data - The data to navigate
   */
  handleNavigate(data: any) {
    const userInfo = this.getUserInfo();
    const url = buildNavigateUrl(data.value, userInfo);

    // Check if custom navigation function is set
    const customNavigate = this.getCustomNavigate();
    if (customNavigate) {
      // Use custom navigation function
      customNavigate(url);
    } else {
      // Use default behavior
      window?.top?.open(url, data.openType === 'same' ? '_self' : '_blank');
    }
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
   * Initialize Socket connection with given credentials
   * @param userId - External user ID
   * @param token - Authentication token
   */
  private async initializeSocket(userId: string, token: string): Promise<void> {
    // Initialize SocketService with connection parameters
    await this.socketService.initialize({
      userId,
      token,
      wsUri: getWsUri(),
    });

    // Set up event listeners on UsertourSocket (which extends Evented)
    this.socketService.on(WebSocketEvents.SET_FLOW_SESSION, (session: unknown) => {
      this.setFlowSession(session as SDKContentSession);
    });
    this.socketService.on(WebSocketEvents.SET_CHECKLIST_SESSION, (session: unknown) => {
      this.setChecklistSession(session as SDKContentSession);
    });
    this.socketService.on(WebSocketEvents.TRACK_CLIENT_CONDITION, (condition: unknown) => {
      this.trackClientCondition(condition as TrackCondition);
    });
  }

  /**
   * Sets the flow session and manages tour lifecycle
   * @param session - The SDK content session to set
   */
  setFlowSession(session: SDKContentSession) {
    if (!session?.content?.id) {
      logger.warn('Invalid session data provided to setFlowSession');
      return;
    }

    const contentId = session.content.id;

    // Find existing tour for this content
    const existingTour = this.tours.find((tour) => tour.getContentId() === contentId);

    // Destroy all other tours to ensure single tour focus
    this.destroyOtherTours(contentId);

    // Update or create tour
    const targetTour = this.updateOrCreateTour(existingTour, session);

    // Sync store and show tour
    this.syncToursStore();
    targetTour?.show(session.currentStep?.cvid);
  }

  /**
   * Destroys all tours except the one with the specified content ID
   * @param keepContentId - The content ID of the tour to keep
   */
  private destroyOtherTours(keepContentId: string): void {
    const toursToDestroy = this.tours.filter((tour) => tour.getContentId() !== keepContentId);

    // Destroy other tours - let errors bubble up for critical failures
    for (const tour of toursToDestroy) {
      tour.destroy();
    }

    // Keep only the tour with the specified content ID
    this.tours = this.tours.filter((tour) => tour.getContentId() === keepContentId);
  }

  /**
   * Updates existing tour or creates a new one
   * @param existingTour - The existing tour if found
   * @param session - The session data
   * @returns The target tour or undefined if creation fails
   */
  private updateOrCreateTour(
    existingTour: UsertourTour | undefined,
    session: SDKContentSession,
  ): UsertourTour | undefined {
    if (existingTour) {
      existingTour.updateSession(session);
      return existingTour;
    }

    // Create new tour - let constructor errors bubble up
    const newTour = new UsertourTour(this, new UsertourSession(session));
    this.tours.push(newTour);
    return newTour;
  }

  setChecklistSession(session: SDKContentSession) {
    console.log('setChecklistSession', session as SDKContentSession);
    //
  }

  /**
   * Tracks a client condition
   * @param condition - The condition to track
   */
  trackClientCondition(condition: TrackCondition) {
    this.addConditions([condition.condition]);
  }

  /**
   * Identifies a user with the given ID and attributes
   * @param userId - External user ID
   * @param attributes - Optional user attributes
   */
  async identify(userId: string, attributes?: UserTourTypes.Attributes): Promise<void> {
    const { token } = this.startOptions;
    if (!token || !this.useCurrentUser()) {
      return;
    }

    this.reset();
    this.startConditionsMonitor();
    // Use dedicated initialization method
    await this.initializeSocket(userId, token);

    const result = await this.socketService.upsertUser(
      {
        userId,
        attributes,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_IDENTIFY_USER);
    }
  }

  /**
   * Creates and identifies an anonymous user
   * @param attributes - Optional user attributes
   */
  async identifyAnonymous(attributes?: UserTourTypes.Attributes): Promise<void> {
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
    console.log('isStarted', contentId);
    return false;
  }

  /**
   * Updates user attributes
   * @param attributes - New user attributes to update
   */
  async updateUser(attributes: UserTourTypes.Attributes): Promise<void> {
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
    const result = await this.socketService.upsertUser(
      {
        userId,
        attributes,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_UPDATE_USER);
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
  ): Promise<void> {
    const { token } = this.startOptions;
    if (!token || !this.userInfo?.externalId) {
      return;
    }
    if (!this.useCurrentUser()) {
      return;
    }
    const userId = this.userInfo.externalId;
    const result = await this.socketService.upsertCompany(
      {
        userId,
        companyId,
        attributes,
        membership: opts?.membership,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_UPDATE_COMPANY);
    }
  }

  /**
   * Updates current company group information
   * @param attributes - Optional company attributes to update
   * @param opts - Optional group settings
   */
  async updateGroup(
    attributes?: UserTourTypes.Attributes,
    opts?: UserTourTypes.GroupOptions,
  ): Promise<void> {
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
    const result = await this.socketService.upsertCompany(
      {
        userId,
        companyId,
        attributes,
        membership: opts?.membership,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_UPDATE_COMPANY);
    }
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
      this.trigger(SDK_CSS_LOADED);
    } else {
      this.trigger(SDK_CSS_LOADED_FAILED);
    }
  }

  getSdkConfig() {
    return this.sdkConfig;
  }

  /**
   * Gets the shared SocketService instance
   */
  getSocketService(): UsertourSocket {
    return this.socketService;
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
    this.trigger(SDK_CONTAINER_CREATED);
  }

  /**
   * Removes the container element from DOM
   */
  unmountContainer() {
    if (this.container) {
      this.container.parentNode?.removeChild(this.container);
    }
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
   * Synchronizes all stores with current data
   */
  private syncAllStores() {
    this.syncToursStore();
  }

  /**
   * Synchronizes tours store
   */
  private syncToursStore() {
    this.toursStore.setData([...this.tours]);
  }

  /**
   * Resets the application state
   */
  reset() {
    this.userInfo = undefined;
    this.companyInfo = undefined;
    this.tours = [];
    timerManager.clear();
  }

  /**
   * Ends all active content and resets the application
   */
  async endAll() {
    // Destroy condition monitor
    this.destroyConditionsMonitor();

    for (const tour of this.tours) {
      tour.destroy();
    }

    this.reset();
  }

  /**
   * Creates and initializes condition monitor
   */
  initializeConditionsMonitor() {
    if (this.conditionsMonitor) {
      this.conditionsMonitor.destroy();
    }

    this.conditionsMonitor = new UsertourConditionsMonitor({ autoStart: false });

    // Listen for condition state change events
    this.conditionsMonitor.on('condition-state-changed', (eventData: unknown) => {
      const changeEvent = eventData as ConditionStateChangeEvent;
      if (!changeEvent?.condition?.id) {
        return;
      }
      this.socketService.toggleClientCondition(
        {
          conditionId: changeEvent?.condition?.id,
          isActive: changeEvent?.state === 'activated',
        },
        { batch: true },
      );
    });
  }

  /**
   * Gets the current condition monitor instance
   */
  getConditionsMonitor(): UsertourConditionsMonitor | null {
    return this.conditionsMonitor;
  }

  /**
   * Starts the condition monitor
   */
  startConditionsMonitor() {
    this.conditionsMonitor?.start();
  }

  /**
   * Adds conditions to the condition monitor
   * @param conditions - The conditions to add
   */
  addConditions(conditions: RulesCondition[]) {
    this.conditionsMonitor?.addConditions(conditions);
  }

  /**
   * Destroys the condition monitor
   */
  destroyConditionsMonitor(): void {
    if (this.conditionsMonitor) {
      this.conditionsMonitor.destroy();
      this.conditionsMonitor = null;
    }
  }
}
