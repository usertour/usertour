import {
  MESSAGE_START_FLOW_WITH_TOKEN,
  SDK_DOM_LOADED,
  STORAGE_IDENTIFY_ANONYMOUS,
  TOUR_CLOSED,
} from '@usertour-packages/constants';
import { AssetAttributes } from '@usertour-packages/frame';
import { storage, uuidV4 } from '@usertour/helpers';
import { contentStartReason, SDKSettingsMode } from '@usertour/types';
import { UserTourTypes } from '@usertour/types';
import { Evented } from '@/utils/evented';
import { ExternalStore } from '@/utils/store';
import { UsertourTour } from '@/core/usertour-tour';
import { UsertourSession } from '@/core/usertour-session';
import { UsertourSocket } from '@/core/usertour-socket';
import { UsertourAttributeManager } from '@/core/usertour-attribute-manager';
import {
  ConditionStateChangeEvent,
  UsertourConditionsMonitor,
} from '@/core/usertour-conditions-monitor';
import {
  WaitTimerStateChangeEvent,
  ConditionWaitTimersMonitor,
} from '@/core/usertour-wait-timer-monitor';
import { UsertourURLMonitor } from '@/core/usertour-url-monitor';
import { UsertourUIManager } from '@/core/usertour-ui-manager';
import {
  autoBind,
  document,
  window,
  on,
  logger,
  getValidMessage,
  sendPreviewSuccessMessage,
  timerManager,
} from '@/utils';
import { buildNavigateUrl, getClientContext } from '@/core/usertour-helper';
import { getWsUri } from '@/core/usertour-env';
import {
  WebSocketEvents,
  ErrorMessages,
  SDKContentSession,
  TrackCondition,
  UnTrackedCondition,
  ConditionWaitTimer,
} from '@/types';

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
  tours: UsertourTour[] = [];
  assets: AssetAttributes[] = [];
  externalUserId: string | undefined;
  externalCompanyId: string | undefined;
  toursStore = new ExternalStore<UsertourTour[]>([]);

  private baseZIndex = 1000000;
  private targetMissingSeconds = 6;
  private customNavigate: ((url: string) => void) | null = null;
  private readonly id: string;

  // Use dedicated attribute manager instead of direct properties
  private attributeManager: UsertourAttributeManager;
  // Use dedicated UI manager for DOM operations
  private uiManager: UsertourUIManager;
  // Condition monitoring
  private conditionsMonitor: UsertourConditionsMonitor | null = null;
  // Wait timer monitoring
  private waitTimerMonitor: ConditionWaitTimersMonitor | null = null;
  // URL monitoring
  private urlMonitor: UsertourURLMonitor | null = null;

  constructor() {
    super();
    autoBind(this);
    this.socketService = new UsertourSocket();
    this.attributeManager = new UsertourAttributeManager();
    this.uiManager = new UsertourUIManager({
      containerId: 'usertour-widget',
      maxRetries: 20,
      retryDelay: 1000,
    });
    this.id = uuidV4();
    this.initializeEventListeners();
    this.initializeConditionsMonitor();
    this.initializeWaitTimerMonitor();
    this.initializeURLMonitor();
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
   * Gets user attributes from attribute manager
   * @returns Current user attributes
   */
  getUserAttributes(): UserTourTypes.Attributes {
    return this.attributeManager.getUserAttributes();
  }

  /**
   * Gets company attributes from attribute manager
   * @returns Current company attributes
   */
  getCompanyAttributes(): UserTourTypes.Attributes {
    return this.attributeManager.getCompanyAttributes();
  }

  /**
   * Gets membership attributes from attribute manager
   * @returns Current membership attributes
   */
  getMembershipAttributes(): UserTourTypes.Attributes {
    return this.attributeManager.getMembershipAttributes();
  }

  /**
   * Gets attribute manager instance
   * @returns The attribute manager instance
   */
  getAttributeManager(): UsertourAttributeManager {
    return this.attributeManager;
  }

  /**
   * Initializes DOM event listeners for the application
   */
  private initializeEventListeners() {
    this.once(SDK_DOM_LOADED, async () => {
      const initialized = await this.uiManager.initialize(this.toursStore);
      if (!initialized) {
        logger.error('Failed to initialize UI manager');
      }
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
  private handlePreviewMessage(e: MessageEvent) {
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
    this.startOptions = Object.assign({}, startOptions);
    //reset
    this.reset();
  }

  /**
   * Starts a content
   * @param contentId - The content ID to start
   * @param opts - The options for starting the content
   * @returns A promise that resolves when the content is started
   */
  async startContent(
    contentId: string,
    startReason: contentStartReason,
    opts?: UserTourTypes.StartOptions,
  ) {
    // Build start options
    const startOptions = {
      stepCvid: opts?.cvid,
      startReason,
      contentId,
    };
    // Start the content
    await this.socketService.startContent(startOptions, { batch: true });
  }

  /**
   * Starts a tour with given content ID
   * @param contentId - content ID to start specific tour
   * @param opts - Optional start options
   */
  async startTour(contentId: string, opts?: UserTourTypes.StartOptions) {
    await this.startContent(contentId, contentStartReason.START_FROM_ACTION, opts);
  }

  /**
   * Handles the navigation
   * @param data - The data to navigate
   */
  handleNavigate(data: any) {
    const userAttributes = this.getUserAttributes();
    const url = buildNavigateUrl(data.value, userAttributes);

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
  private async initializeSocket(externalUserId: string, token: string): Promise<void> {
    // Initialize SocketService with connection parameters
    await this.socketService.initialize({
      externalUserId,
      token,
      wsUri: getWsUri(),
    });

    // Set up event listeners on UsertourSocket (which extends Evented)
    this.socketService.on(WebSocketEvents.SET_FLOW_SESSION, (session: unknown) => {
      return this.setFlowSession(session as SDKContentSession);
    });
    this.socketService.on(WebSocketEvents.SET_CHECKLIST_SESSION, (session: unknown) => {
      return this.setChecklistSession(session as SDKContentSession);
    });
    this.socketService.on(WebSocketEvents.UNSET_FLOW_SESSION, (message: unknown) => {
      const data = message as { sessionId: string };
      return this.unsetFlowSession(data.sessionId);
    });
    this.socketService.on(WebSocketEvents.TRACK_CLIENT_CONDITION, (condition: unknown) => {
      return this.trackClientCondition(condition as TrackCondition);
    });
    this.socketService.on(WebSocketEvents.UNTRACK_CLIENT_CONDITION, (message: unknown) => {
      const untrackedCondition = message as UnTrackedCondition;
      return this.removeConditions([untrackedCondition.conditionId]);
    });
    this.socketService.on(WebSocketEvents.START_CONDITION_WAIT_TIMER, (condition: unknown) => {
      return this.startConditionWaitTimer(condition as ConditionWaitTimer);
    });
    this.socketService.on(WebSocketEvents.CANCEL_CONDITION_WAIT_TIMER, (condition: unknown) => {
      return this.cancelConditionWaitTimer(condition as ConditionWaitTimer);
    });
  }

  /**
   * Sets the flow session and manages tour lifecycle
   * @param session - The SDK content session to set
   */
  setFlowSession(session: SDKContentSession): boolean {
    if (!session?.content?.id) {
      logger.warn('Invalid session data provided to setFlowSession');
      return false;
    }

    const contentId = session.content.id;

    // Find existing tour for this content
    const existingTour = this.tours.find((tour) => tour.getContentId() === contentId);

    // Destroy all other tours to ensure single tour focus
    this.destroyOtherTours(contentId);

    // Update existing tour if found
    if (existingTour) {
      existingTour.updateSession(session);
      existingTour.refreshStore();
      return true;
    }

    // Create new tour
    const targetTour = new UsertourTour(this, new UsertourSession(session));
    targetTour.on(TOUR_CLOSED, (eventData: unknown) => {
      const closeEvent = eventData as { sessionId: string };
      this.tours = this.tours.filter((tour) => tour.getSessionId() !== closeEvent.sessionId);
      this.syncToursStore();
    });
    // Add new tour to the tours array
    this.tours.push(targetTour);
    // Sync store
    this.syncToursStore();
    // Show tour from the session current step
    targetTour.show(session.currentStep?.cvid);
    return true;
  }

  /**
   * Unsets the flow session and destroys the tour
   * @param sessionId - The session ID to unset
   */
  unsetFlowSession(sessionId: string): boolean {
    const tourToDestroy = this.tours.find((tour) => tour.getSessionId() === sessionId);

    if (!tourToDestroy) {
      return false;
    }
    tourToDestroy.destroy();

    // Keep only the tour with the specified session ID
    this.tours = this.tours.filter((tour) => tour.getSessionId() !== sessionId);
    // Sync store
    this.syncToursStore();
    return true;
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

  setChecklistSession(session: SDKContentSession): boolean {
    console.log('setChecklistSession', session as SDKContentSession);
    return true;
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

    // First call API with new attributes
    const result = await this.socketService.upsertUser(
      {
        externalUserId: userId,
        attributes,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_IDENTIFY_USER);
    }

    // Only update local state after successful API call
    this.externalUserId = userId;
    if (attributes) {
      this.attributeManager.setUserAttributes(attributes);
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
    return Boolean(this.externalUserId);
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
    if (!token || !this.externalUserId || !this.useCurrentUser()) {
      return;
    }

    // Check if attributes have actually changed to avoid unnecessary API calls
    if (!this.attributeManager.userAttrsChanged(attributes)) {
      return; // No changes detected, skip the update
    }

    // First call API with new attributes
    const externalUserId = this.externalUserId;
    const result = await this.socketService.upsertUser(
      {
        externalUserId,
        attributes,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_UPDATE_USER);
    }

    // Only update local state after successful API call
    this.attributeManager.setUserAttributes(attributes);
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
    if (!token || !this.externalUserId || !this.useCurrentUser()) {
      return;
    }

    // First call API with new attributes
    const externalUserId = this.externalUserId;
    const result = await this.socketService.upsertCompany(
      {
        externalUserId,
        externalCompanyId: companyId,
        attributes,
        membership: opts?.membership,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_UPDATE_COMPANY);
    }

    // Only update local state after successful API call
    this.externalCompanyId = companyId;
    // Update socket auth info
    this.updateSocketAuthInfo();
    if (attributes) {
      this.attributeManager.setCompanyAttributes(attributes);
    }
    if (opts?.membership) {
      this.attributeManager.setMembershipAttributes(opts.membership);
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
    if (!token || !this.externalCompanyId || !this.externalUserId || !this.useCurrentUser()) {
      return;
    }

    // Check if attributes have actually changed to avoid unnecessary API calls
    const hasCompanyChanged = attributes && this.attributeManager.companyAttrsChanged(attributes);
    const hasMembershipChanged =
      opts?.membership && this.attributeManager.membershipAttrsChanged(opts.membership);

    if (!hasCompanyChanged && !hasMembershipChanged) {
      return; // No changes detected, skip the update
    }

    // First call API with new attributes
    const externalUserId = this.externalUserId;
    const externalCompanyId = this.externalCompanyId;
    const result = await this.socketService.upsertCompany(
      {
        externalUserId,
        externalCompanyId,
        attributes,
        membership: opts?.membership,
      },
      { batch: true },
    );
    if (!result) {
      throw new Error(ErrorMessages.FAILED_TO_UPDATE_COMPANY);
    }

    // Only update local state after successful API call
    if (attributes) {
      this.attributeManager.setCompanyAttributes(attributes);
    }
    if (opts?.membership) {
      this.attributeManager.setMembershipAttributes(opts.membership);
    }
  }

  /**
   * Gets the shared SocketService instance
   */
  getSocketService(): UsertourSocket {
    return this.socketService;
  }

  /**
   * Checks if the app is ready to start
   * @returns true if the app is ready to start, false otherwise
   */
  isReady() {
    return this.uiManager.isReady() && this.externalUserId;
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
    this.externalUserId = undefined;
    this.externalCompanyId = undefined;
    // Clear all attributes using the attribute manager
    this.attributeManager.clear();
    this.tours = [];
    timerManager.clear();
  }

  /**
   * Ends all active content and resets the application
   */
  async endAll() {
    // Destroy condition monitor
    this.destroyConditionsMonitor();

    // Destroy wait timer monitor
    this.destroyWaitTimerMonitor();

    // Destroy URL monitor
    this.destroyURLMonitor();

    // Destroy all tours
    for (const tour of this.tours) {
      tour.destroy();
    }

    // Destroy UI manager
    this.uiManager.destroy();

    this.reset();
  }

  /**
   * Creates and initializes condition monitor
   */
  private initializeConditionsMonitor() {
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
      // Update socket auth info
      this.updateSocketAuthInfo();
      // Toggle client condition
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
   * Creates and initializes wait timer monitor
   */
  private initializeWaitTimerMonitor() {
    if (this.waitTimerMonitor) {
      this.waitTimerMonitor.destroy();
    }

    this.waitTimerMonitor = new ConditionWaitTimersMonitor({ autoStart: true });

    // Listen for wait timer state change events
    this.waitTimerMonitor.on('wait-timer-state-changed', async (eventData: unknown) => {
      const changeEvent = eventData as WaitTimerStateChangeEvent;
      if (!changeEvent?.condition?.versionId) {
        return;
      }

      // Handle timer firing - could trigger next step or other actions
      if (changeEvent.state === 'fired') {
        const result = await this.socketService.fireConditionWaitTimer(
          {
            versionId: changeEvent.condition.versionId,
          },
          { batch: true },
        );
        if (!result) {
          logger.error(
            `Failed to fire wait timer for versionId: ${changeEvent.condition.versionId}`,
          );
        }
      }
    });
  }

  /**
   * Updates the socket auth info
   */
  private updateSocketAuthInfo() {
    const clientConditions = this.conditionsMonitor?.getClientConditions();
    const externalCompanyId = this.externalCompanyId;
    const clientContext = getClientContext();
    this.socketService.updateCredentials({
      clientConditions,
      externalCompanyId,
      clientContext,
    });
  }

  /**
   * Starts the condition monitor
   */
  private startConditionsMonitor() {
    this.conditionsMonitor?.start();
  }

  /**
   * Tracks a client condition
   * @param condition - The condition to track
   */
  private trackClientCondition(condition: TrackCondition): boolean {
    this.conditionsMonitor?.addConditions([condition.condition]);
    return true;
  }

  /**
   * Removes conditions from the condition monitor
   * @param conditionIds - The IDs of the conditions to remove
   */
  private removeConditions(conditionIds: string[]): boolean {
    this.conditionsMonitor?.removeConditions(conditionIds);
    return true;
  }

  /**
   * Starts a wait timer condition
   * @param condition - The condition to start
   */
  private startConditionWaitTimer(condition: ConditionWaitTimer): boolean {
    this.waitTimerMonitor?.addWaitTimer(condition);
    return true;
  }

  /**
   * Cancels a wait timer condition
   * @param condition - The condition to cancel
   */
  private cancelConditionWaitTimer(condition: ConditionWaitTimer): boolean {
    this.waitTimerMonitor?.cancelWaitTimer(condition.versionId);
    return true;
  }

  /**
   * Destroys the condition monitor
   */
  private destroyConditionsMonitor(): void {
    if (this.conditionsMonitor) {
      this.conditionsMonitor.destroy();
      this.conditionsMonitor = null;
    }
  }

  /**
   * Destroys the wait timer monitor
   */
  private destroyWaitTimerMonitor(): void {
    if (this.waitTimerMonitor) {
      this.waitTimerMonitor.destroy();
      this.waitTimerMonitor = null;
    }
  }

  /**
   * Creates and initializes URL monitor
   */
  private initializeURLMonitor() {
    if (this.urlMonitor) {
      this.urlMonitor.destroy();
    }

    this.urlMonitor = new UsertourURLMonitor({
      autoStart: true,
      interval: 500,
    });

    // Listen for URL change events
    this.urlMonitor.on('url-changed', () => {
      const clientContext = getClientContext();
      this.socketService.updateClientContext(clientContext, { batch: true });
    });
  }

  /**
   * Destroys the URL monitor
   */
  private destroyURLMonitor(): void {
    if (this.urlMonitor) {
      this.urlMonitor.destroy();
      this.urlMonitor = null;
    }
  }
}
