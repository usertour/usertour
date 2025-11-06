import {
  SDKClientEvents,
  MESSAGE_START_FLOW_WITH_TOKEN,
  StorageKeys,
} from '@usertour-packages/constants';
import { AssetAttributes } from '@usertour-packages/frame';
import { isEmptyString, isNullish, storage, uuidV4 } from '@usertour/helpers';
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
import { getClientContext } from '@/core/usertour-helper';
import {
  WebSocketEvents,
  ErrorMessages,
  CustomContentSession,
  TrackCondition,
  ConditionWaitTimer,
  ClientCondition,
} from '@/types';
import { formatErrorMessage } from '@/types/error-messages';
import { UsertourChecklist } from './usertour-checklist';
import { UsertourLauncher } from './usertour-launcher';
import {
  ServerMessageHandlerManager,
  ServerMessageHandlerContext,
} from './server-message-handlers';

interface AppStartOptions {
  environmentId?: string;
  mode: SDKSettingsMode;
  contentId?: string;
  versionId?: string;
  token: string;
}

export class UsertourCore extends Evented {
  // === Public Properties ===
  socketService: UsertourSocket;
  startOptions: AppStartOptions = {
    environmentId: '',
    token: '',
    mode: SDKSettingsMode.NORMAL,
  };
  toursStore = new ExternalStore<UsertourTour[]>([]);
  checklistsStore = new ExternalStore<UsertourChecklist[]>([]);
  launchersStore = new ExternalStore<UsertourLauncher[]>([]);
  activatedTour: UsertourTour | null = null;
  activatedChecklist: UsertourChecklist | null = null;
  launchers: UsertourLauncher[] = [];
  assets: AssetAttributes[] = [];
  externalUserId: string | undefined;
  externalCompanyId: string | undefined;

  // === Private Properties ===
  private baseZIndex = 1000000;
  private targetMissingSeconds = 6;
  private customNavigate: ((url: string) => void) | null = null;
  private readonly id: string;
  private attributeManager: UsertourAttributeManager;
  private uiManager: UsertourUIManager;
  private conditionsMonitor: UsertourConditionsMonitor | null = null;
  private waitTimerMonitor: ConditionWaitTimersMonitor | null = null;
  private urlMonitor: UsertourURLMonitor | null = null;
  private serverMessageHandlerManager: ServerMessageHandlerManager;

  // === Constructor ===
  constructor() {
    super();
    autoBind(this);
    this.socketService = new UsertourSocket();
    this.attributeManager = new UsertourAttributeManager();
    this.serverMessageHandlerManager = new ServerMessageHandlerManager();
    this.uiManager = new UsertourUIManager();
    this.id = uuidV4();
    this.initializeEventListeners();
    this.initializeSocketEventListeners();
    this.initializeConditionsMonitor();
    this.initializeWaitTimerMonitor();
    this.initializeURLMonitor();
  }

  // === Public API: Initialization ===
  /**
   * Initializes the application with the given options
   * @param startOptions - Configuration options for starting the app
   */
  init(startOptions: AppStartOptions) {
    if (isNullish(startOptions.token) || isEmptyString(startOptions.token)) {
      throw new Error(formatErrorMessage(ErrorMessages.INVALID_TOKEN, startOptions.token));
    }
    if (this.startOptions.token !== startOptions.token) {
      this.reset();
    }
    this.startOptions = Object.assign({}, startOptions);
  }

  // === Public API: User Management ===
  /**
   * Identifies a user with the given ID and attributes
   * @param userId - External user ID
   * @param attributes - Optional user attributes
   */
  async identify(userId: string, attributes?: UserTourTypes.Attributes): Promise<void> {
    // Ensure the SDK has been initialized before calling identify
    this.ensureInit();

    if (isNullish(userId) || isEmptyString(userId)) {
      throw new Error(formatErrorMessage(ErrorMessages.INVALID_USER_ID, userId));
    }

    // Reset if user ID has changed
    if (this.externalUserId !== userId) {
      this.reset();
    }

    // Start monitors (idempotent, safe to call multiple times)
    this.startConditionsMonitor();
    this.startURLMonitor();

    const { token } = this.startOptions;
    // Use dedicated initialization method
    if (!(await this.socketService.connect(userId, token))) {
      logger.error('Failed to initialize socket');
      return;
    }

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
    this.trigger(SDKClientEvents.USER_IDENTIFIED_SUCCEEDED, { userId, attributes });
  }

  /**
   * Creates and identifies an anonymous user
   * @param attributes - Optional user attributes
   */
  async identifyAnonymous(attributes?: UserTourTypes.Attributes): Promise<void> {
    // Ensure the SDK has been initialized before calling identifyAnonymous
    this.ensureInit();

    const key = StorageKeys.IDENTIFY_ANONYMOUS;
    const storageData = storage.getLocalStorage(key) as { userId: string } | undefined;
    let userId = '';
    if (storageData?.userId) {
      userId = storageData.userId;
    } else {
      userId = `anon-${uuidV4()}`;
      storage.setLocalStorage(key, { userId });
    }
    await this.identify(userId, attributes);
  }

  /**
   * Updates user attributes
   * @param attributes - New user attributes to update
   */
  async updateUser(attributes: UserTourTypes.Attributes): Promise<void> {
    // Ensure the SDK has been initialized before calling updateUser
    const externalUserId = this.ensureIdentify();

    // Check if attributes have actually changed to avoid unnecessary API calls
    if (!this.attributeManager.userAttrsChanged(attributes)) {
      return; // No changes detected, skip the update
    }
    // First call API with new attributes
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
    // Ensure the SDK has been initialized before calling group
    const externalUserId = this.ensureIdentify();

    // Validate company ID
    if (isNullish(companyId) || isEmptyString(companyId)) {
      throw new Error(formatErrorMessage(ErrorMessages.INVALID_COMPANY_ID, companyId));
    }

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
    const externalUserId = this.ensureIdentify();
    const externalCompanyId = this.ensureGroup();

    // Check if attributes have actually changed to avoid unnecessary API calls
    const hasCompanyChanged = attributes && this.attributeManager.companyAttrsChanged(attributes);
    const hasMembershipChanged =
      opts?.membership && this.attributeManager.membershipAttrsChanged(opts.membership);

    if (!hasCompanyChanged && !hasMembershipChanged) {
      return; // No changes detected, skip the update
    }

    // First call API with new attributes
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

  // === Public API: Content Management ===
  /**
   * Starts a content
   * @param contentId - The content ID to start
   * @param startReason - The reason for starting the content
   * @param opts - The options for starting the content
   * @param batch - Whether to batch the request
   * @returns A promise that resolves when the content is started
   */
  async startContent(
    contentId: string,
    startReason: contentStartReason,
    opts?: UserTourTypes.StartOptions,
    batch = false,
  ) {
    // Ensure the SDK has been initialized before calling startContent
    this.ensureIdentify();
    // Validate content ID
    if (isNullish(contentId) || isEmptyString(contentId)) {
      throw new Error(formatErrorMessage(ErrorMessages.INVALID_CONTENT_ID, contentId));
    }

    // Build start options
    const startOptions = {
      stepCvid: opts?.cvid,
      startReason,
      contentId,
    };
    // Start the content
    await this.socketService.startContent(startOptions, { batch });
  }

  /**
   * Checks URL for 'usertour' parameter and starts the content if found
   * Removes the parameter from URL after processing
   */
  async checkUrlAndStartContent(): Promise<void> {
    if (!window?.location) {
      return;
    }

    const url = new URL(window.location.href);
    const contentId = url.searchParams.get('usertour');

    if (!contentId) {
      return;
    }

    // Start the content with URL start reason
    await this.startContent(contentId, contentStartReason.START_FROM_URL);

    // Remove the parameter from URL and update browser history
    url.searchParams.delete('usertour');
    window.history.replaceState({}, '', url.toString());
  }

  // === Public API: Configuration ===
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
      throw new Error(ErrorMessages.TARGET_MISSING_TIME_EXCEEDED);
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

  // === Public API: State Queries ===
  /**
   * Checks if app is in preview mode
   * @returns True if in preview mode, false otherwise
   */
  isPreview() {
    return this.startOptions.mode === SDKSettingsMode.PREVIEW;
  }

  /**
   * Checks if a user is identified
   * @returns True if user info exists, false otherwise
   */
  isIdentified() {
    return Boolean(this.externalUserId);
  }

  /**
   * Ensures that the SDK has been initialized
   * @throws {Error} If init() has not been called
   */
  ensureInit() {
    if (!this.startOptions.token) {
      throw new Error(ErrorMessages.MUST_INIT_FIRST);
    }
  }

  /**
   * Ensures that a user has been identified
   * @returns The external user ID
   * @throws {Error} If init() or identify() has not been called
   */
  ensureIdentify() {
    this.ensureInit();
    if (!this.externalUserId) {
      throw new Error(ErrorMessages.MUST_IDENTIFY_FIRST);
    }
    return this.externalUserId;
  }

  /**
   * Ensures that a group has been set
   * @returns The external company ID
   * @throws {Error} If init(), identify(), or group() has not been called
   */
  ensureGroup() {
    this.ensureIdentify();
    if (!this.externalCompanyId) {
      throw new Error(ErrorMessages.MUST_GROUP_FIRST);
    }
    return this.externalCompanyId;
  }

  /**
   * Ensures that the UI manager has been initialized
   * @throws {Error} If UI manager initialization fails
   */
  async ensureUIManagerInitialized(): Promise<void> {
    const initialized = await this.uiManager.initialize({
      toursStore: this.toursStore,
      checklistsStore: this.checklistsStore,
      launchersStore: this.launchersStore,
    });

    if (!initialized) {
      throw new Error(ErrorMessages.UI_INITIALIZATION_MAX_RETRIES_EXCEEDED);
    }
  }

  /**
   * Checks if a content is currently active
   * @param contentId - The content ID to check
   * @returns True if the content is currently active, false otherwise
   */
  isStarted(contentId: string) {
    return (
      this.activatedChecklist?.getContentId() === contentId ||
      this.activatedTour?.getContentId() === contentId ||
      this.launchers.some((launcher) => launcher.getContentId() === contentId)
    );
  }

  // === Public API: Utilities ===
  /**
   * Gets user attributes from attribute manager
   * @returns Current user attributes
   */
  getUserAttributes(): UserTourTypes.Attributes {
    return this.attributeManager.getUserAttributes();
  }

  /**
   * Gets client conditions from conditions monitor
   * @returns Array of client conditions with their current state
   */
  getClientConditions(): ClientCondition[] {
    if (!this.conditionsMonitor) return [];

    const conditions = this.conditionsMonitor.getConditions();
    const activeIds = this.conditionsMonitor.getActiveConditionIds();

    return conditions.map((trackCondition) => ({
      contentId: trackCondition.contentId,
      versionId: trackCondition.versionId,
      contentType: trackCondition.contentType,
      conditionId: trackCondition.condition.id,
      isActive: activeIds.has(trackCondition.condition.id),
    }));
  }

  /**
   * Gets the shared SocketService instance
   */
  getSocketService(): UsertourSocket {
    return this.socketService;
  }

  // === Public API: Lifecycle ===
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
   * Ends all active content and resets the application
   */
  async endAll() {
    this.reset();
  }

  /**
   * Resets the application state
   */
  reset() {
    // Cleanup user data
    this.cleanupUserData();
    // Cleanup activated tour
    this.cleanupActivatedTour();
    // Cleanup activated checklist
    this.cleanupActivatedChecklist();
    // Cleanup launchers
    this.cleanupLaunchers();
    // Cleanup condition monitor
    this.cleanupConditionsMonitor();
    // Cleanup wait timer monitor
    this.cleanupWaitTimerMonitor();
    // Stop URL monitor
    this.cleanupURLMonitor();
    // Cleanup time manager
    this.cleanupTimeManager();
  }

  // === Event Listeners Initialization ===
  /**
   * Initializes DOM event listeners for the application
   */
  private initializeEventListeners() {
    this.setupUIManagerInitialization();
    this.setupDOMReadyTrigger();
    this.setupPreviewMessageListener();

    // Subscribe to succeeded server message to refresh credentials immediately
    this.on(SDKClientEvents.SERVER_MESSAGE_SUCCEEDED, this.handleServerMessageSucceeded);
    this.once(SDKClientEvents.USER_IDENTIFIED_SUCCEEDED, this.handleUserFirstIdentified);
  }

  /**
   * Sets up UI manager initialization when DOM is loaded
   */
  private setupUIManagerInitialization() {
    this.once(SDKClientEvents.DOM_LOADED, async () => {
      await this.ensureUIManagerInitialized();
    });
  }

  /**
   * Sets up DOM ready state checking and triggers DOM_LOADED event
   */
  private setupDOMReadyTrigger() {
    if (document?.readyState !== 'loading') {
      this.trigger(SDKClientEvents.DOM_LOADED);
    } else if (document) {
      on(document, 'DOMContentLoaded', () => {
        this.trigger(SDKClientEvents.DOM_LOADED);
      });
    }
  }

  /**
   * Sets up window message listener for preview messages
   */
  private setupPreviewMessageListener() {
    if (window) {
      on(window, 'message', this.handlePreviewMessage);
    }
  }

  /**
   * Initialize socket event listeners
   * This method sets up all WebSocket event handlers after socket is initialized
   */
  private initializeSocketEventListeners(): void {
    this.socketService.on(WebSocketEvents.SERVER_MESSAGE, this.handleServerMessage);
  }

  // === Message Handling ===
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
   * Handle server message by routing to appropriate handler
   * @param message - The server message containing kind and payload
   * @returns Promise<boolean> - True if message was handled successfully
   */
  private async handleServerMessage(message: unknown): Promise<boolean> {
    const context = this.createServerMessageHandlerContext();
    const success = await this.serverMessageHandlerManager.handleServerMessage(message, context);

    // Trigger appropriate event based on result
    const event = success
      ? SDKClientEvents.SERVER_MESSAGE_SUCCEEDED
      : SDKClientEvents.SERVER_MESSAGE_FAILED;
    this.trigger(event, message);

    return success;
  }

  /**
   * Creates a context object for server message handlers
   * @returns ServerMessageHandlerContext with bound methods
   */
  private createServerMessageHandlerContext(): ServerMessageHandlerContext {
    return {
      setFlowSession: (session: CustomContentSession) => this.setFlowSession(session),
      forceGoToStep: (sessionId: string, stepId: string) => this.forceGoToStep(sessionId, stepId),
      unsetFlowSession: (sessionId: string) => this.unsetFlowSession(sessionId),
      setChecklistSession: (session: CustomContentSession) => this.setChecklistSession(session),
      unsetChecklistSession: (sessionId: string) => this.unsetChecklistSession(sessionId),
      addLauncher: (session: CustomContentSession) => this.addLauncher(session),
      removeLauncher: (contentId: string) => this.removeLauncher(contentId),
      trackClientCondition: (condition: TrackCondition) => this.trackClientCondition(condition),
      removeConditions: (conditionIds: string[]) => this.removeConditions(conditionIds),
      startConditionWaitTimer: (condition: ConditionWaitTimer) =>
        this.startConditionWaitTimer(condition),
      cancelConditionWaitTimer: (condition: ConditionWaitTimer) =>
        this.cancelConditionWaitTimer(condition),
      getActivatedChecklist: () => this.activatedChecklist,
    };
  }

  /**
   * Handles server message succeeded event - refreshes socket credentials
   * @param _payload - Contains kind and payload from the succeeded message (unused)
   * @returns void
   */
  private handleServerMessageSucceeded(_payload: unknown) {
    this.syncSocketCredentials();
  }

  /**
   * Handles user identified event - checks URL for 'usertour' parameter and starts the content if found
   */
  private handleUserFirstIdentified() {
    this.checkUrlAndStartContent();
  }

  // === Session Management ===
  /**
   * Sets the flow session and manages tour lifecycle
   * @param session - The SDK content session to set
   */
  private setFlowSession(session: CustomContentSession): boolean {
    const contentId = session.content.id;
    const hasActivatedTour = this.activatedTour !== null;

    if (this.activatedTour) {
      if (this.activatedTour.getContentId() === contentId) {
        this.activatedTour.updateSession(session);
        this.activatedTour.refreshStoreData();
        return true;
      }
      this.cleanupActivatedTour();
    }

    // Create new tour
    const usertourTour = new UsertourTour(this, new UsertourSession(session));
    usertourTour.on(SDKClientEvents.COMPONENT_CLOSED, () => {
      this.cleanupActivatedTour();
      this.expandChecklist();
    });
    this.activatedTour = usertourTour;
    // Sync store
    this.syncToursStore([this.activatedTour]);
    // Show tour from the session current step
    if (session.currentStep?.cvid) {
      usertourTour.showStepByCvid(session.currentStep?.cvid);
    } else {
      usertourTour.showStepByIndex(0);
    }
    if (!hasActivatedTour) {
      this.collapseChecklist();
    }
    return true;
  }

  /**
   * Unsets the flow session and destroys the tour
   * @param sessionId - The session ID to unset
   */
  private unsetFlowSession(sessionId: string): boolean {
    if (!this.activatedTour || this.activatedTour.getSessionId() !== sessionId) {
      return false;
    }
    this.cleanupActivatedTour();
    this.expandChecklist();
    return true;
  }

  /**
   * Forces a step to be shown in the tour
   * @param sessionId - The session ID to force go to step
   * @param stepId - The step ID to force go to step
   * @returns True if the step was forced to be shown, false otherwise
   */
  private forceGoToStep(sessionId: string, stepId: string): boolean {
    if (!this.activatedTour || this.activatedTour.getSessionId() !== sessionId) {
      return false;
    }
    this.activatedTour.showStepById(stepId);
    return true;
  }

  /**
   * Sets the checklist session and manages checklist lifecycle
   * @param session - The SDK content session to set
   */
  private setChecklistSession(session: CustomContentSession): boolean {
    const contentId = session.content.id;

    if (this.activatedChecklist) {
      if (this.activatedChecklist.getContentId() === contentId) {
        this.activatedChecklist.updateSession(session);
        this.activatedChecklist.refreshStoreData();
        return true;
      }
      this.cleanupActivatedChecklist();
    }

    // Create new checklist
    this.activatedChecklist = new UsertourChecklist(this, new UsertourSession(session));
    this.activatedChecklist.on(SDKClientEvents.COMPONENT_CLOSED, () => {
      this.cleanupActivatedChecklist();
    });
    // Sync store
    this.syncChecklistsStore([this.activatedChecklist]);
    // Show checklist
    this.activatedChecklist.show();
    return true;
  }

  /**
   * Unsets the checklist session and destroys the checklist
   * @param sessionId - The session ID to unset
   */
  private unsetChecklistSession(sessionId: string): boolean {
    if (!this.activatedChecklist || this.activatedChecklist.getSessionId() !== sessionId) {
      return false;
    }
    this.cleanupActivatedChecklist();
    return true;
  }

  /**
   * Expands the checklist
   */
  private expandChecklist() {
    if (!this.activatedTour && this.activatedChecklist) {
      if (this.activatedChecklist.hasUnackedTasks() || this.activatedChecklist.isExpanded()) {
        this.activatedChecklist.expand(true, true);
      }
    }
  }

  /**
   * Hides the activated checklist
   */
  private collapseChecklist() {
    if (this.activatedChecklist) {
      this.activatedChecklist.expand(false, false);
    }
  }

  // === Launcher Management ===
  /**
   * Adds a launcher to the application
   * @param session - The SDK content session to add the launcher to
   * @returns True if the launcher was added, false otherwise
   */
  private async addLauncher(session: CustomContentSession): Promise<boolean> {
    const contentId = session.content.id;
    const existingLauncher = this.launchers.find(
      (launcher) => launcher.getContentId() === contentId,
    );
    if (existingLauncher) {
      existingLauncher.updateSession(session);
      await existingLauncher.refreshStoreData();
      await existingLauncher.show();
      return true;
    }
    const launcher = new UsertourLauncher(this, new UsertourSession(session));
    launcher.on(SDKClientEvents.COMPONENT_CLOSED, () => {
      this.removeLauncher(contentId);
    });
    this.launchers.push(launcher);
    // Sync store
    this.syncLaunchersStore(this.launchers);
    launcher.show();
    return true;
  }

  /**
   * Removes a launcher from the application
   * @param contentId - The content ID to remove the launcher from
   * @returns True if the launcher was removed, false otherwise
   */
  private removeLauncher(contentId: string): boolean {
    const launcher = this.launchers.find((launcher) => launcher.getContentId() === contentId);
    if (!launcher) {
      return false;
    }
    // Destroy the launcher
    launcher.destroy();
    // Remove from the launchers array
    this.launchers = this.launchers.filter((item) => item.getContentId() !== contentId);
    this.launchersStore.setData(this.launchers);
    return true;
  }

  // === Store Synchronization ===
  /**
   * Synchronizes tours store
   */
  private syncToursStore(tours: UsertourTour[]) {
    this.toursStore.setData([...tours]);
  }

  /**
   * Synchronizes checklists store
   */
  private syncChecklistsStore(checklists: UsertourChecklist[]) {
    this.checklistsStore.setData([...checklists]);
  }

  /**
   * Synchronizes launchers store
   */
  private syncLaunchersStore(launchers: UsertourLauncher[]) {
    this.launchersStore.setData([...launchers]);
  }

  // === Monitor Initialization ===
  /**
   * Creates and initializes condition monitor
   */
  private initializeConditionsMonitor() {
    this.conditionsMonitor = new UsertourConditionsMonitor({ autoStart: false });

    // Listen for condition state change events
    this.conditionsMonitor.on('condition-state-changed', (eventData: unknown) => {
      const changeEvent = eventData as ConditionStateChangeEvent;
      const { trackCondition, state } = changeEvent;

      if (!trackCondition?.condition?.id) {
        return;
      }

      // Toggle client condition
      this.socketService.toggleClientCondition(
        {
          contentId: trackCondition.contentId,
          versionId: trackCondition.versionId,
          conditionId: trackCondition.condition.id,
          contentType: trackCondition.contentType,
          isActive: state === 'activated',
        },
        { batch: true },
      );
    });
  }

  /**
   * Creates and initializes wait timer monitor
   */
  private initializeWaitTimerMonitor() {
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
   * Creates and initializes URL monitor
   */
  private initializeURLMonitor() {
    this.urlMonitor = new UsertourURLMonitor({
      autoStart: true,
      interval: 500,
    });

    // Listen for URL change events
    this.urlMonitor.on('url-changed', async () => {
      const clientContext = getClientContext();
      await this.socketService.updateClientContext(clientContext, { batch: true });
      await this.checkUrlAndStartContent();
    });
  }

  // === Monitor Management ===
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
    this.conditionsMonitor?.addConditions([condition]);
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
   * Starts the URL monitor
   */
  private startURLMonitor() {
    this.urlMonitor?.start();
  }

  // === Socket Credentials Synchronization ===
  /**
   * Synchronizes socket credentials
   */
  private syncSocketCredentials() {
    const clientConditions = this.getClientConditions();
    const clientContext = getClientContext();
    const externalCompanyId = this.externalCompanyId;
    const externalUserId = this.externalUserId;
    const token = this.startOptions.token;
    const flowSessionId = this.activatedTour?.getSessionId();
    const checklistSessionId = this.activatedChecklist?.getSessionId();
    const launchers = this.launchers.map((l) => l.getContentId());
    this.socketService.updateCredentials({
      clientConditions,
      clientContext,
      externalCompanyId,
      externalUserId,
      token,
      flowSessionId,
      checklistSessionId,
      launchers,
    });
  }

  // === Cleanup ===
  /**
   * Cleans up user-related data including external IDs and attributes
   */
  private cleanupUserData() {
    this.externalUserId = undefined;
    this.externalCompanyId = undefined;
    // Cleanup all attributes using the attribute manager
    this.attributeManager.cleanup();
  }

  /**
   * Cleans up all tours from the application
   */
  private cleanupActivatedTour() {
    // Destroy all tours
    this.activatedTour?.destroy();
    this.activatedTour = null;
    this.toursStore.setData(undefined);
  }

  /**
   * Cleans up the activated checklist
   */
  private cleanupActivatedChecklist() {
    // Destroy the checklist
    this.activatedChecklist?.destroy();
    this.activatedChecklist = null;
    this.checklistsStore.setData(undefined);
  }

  /**
   * Cleans up all launchers from the application
   */
  private cleanupLaunchers() {
    // Cleanup all launchers
    for (const launcher of this.launchers) {
      launcher.destroy();
    }
    this.launchers = [];
    this.launchersStore.setData([]);
  }

  /**
   * Cleans up the condition monitor
   */
  private cleanupConditionsMonitor(): void {
    this.conditionsMonitor?.cleanup();
  }

  /**
   * Cleans up the wait timer monitor
   */
  private cleanupWaitTimerMonitor(): void {
    this.waitTimerMonitor?.cleanup();
  }

  /**
   * Clean up the URL monitor
   */
  private cleanupURLMonitor(): void {
    this.urlMonitor?.cleanup();
  }

  /**
   * Clean up the timer manager
   */
  private cleanupTimeManager(): void {
    timerManager.cleanup();
  }
}
