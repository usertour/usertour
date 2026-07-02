import {
  ClientContext,
  AnswerQuestionDto,
  UpsertUserDto,
  UpsertCompanyDto,
  TrackEventDto,
  StartContentDto,
  EndContentDto,
  GoToStepDto,
  ClickChecklistTaskDto,
  HideChecklistDto,
  ShowChecklistDto,
  TooltipTargetMissingDto,
  FireConditionWaitTimerDto,
  ActivateLauncherDto,
  DismissLauncherDto,
  TrackTrackerEventDto,
  OpenResourceCenterDto,
  CloseResourceCenterDto,
  ClickResourceCenterDto,
  ListResourceCenterBlockContentDto,
  ResourceCenterBlockContentItem,
  ListAnnouncementsResult,
  GetAnnouncementDto,
  AnnouncementDetail,
  MarkAnnouncementsSeenDto,
  ClientCondition,
  WebSocketEvents,
  ClientMessageKind,
  SocketAuthData,
} from '@usertour/types';
import { Socket, logger, timerManager } from '@/utils';
import { getWsUri } from '@/core/usertour-env';
import { WEBSOCKET_NAMESPACES_V2 } from '@usertour/constants';
import { getClientContext } from '@/core/usertour-helper';
import { uuidV4 } from '@usertour/helpers';

// === Interfaces ===
// Batch options interface for consistency
export interface BatchOptions {
  batch?: boolean;
}

/**
 * Socket service interface for type safety and testing
 */
export interface IUsertourSocket {
  // User and Company operations
  upsertUser(params: UpsertUserDto, options?: BatchOptions): Promise<boolean>;
  upsertCompany(params: UpsertCompanyDto, options?: BatchOptions): Promise<boolean>;

  // Event tracking
  trackEvent(params: TrackEventDto, options?: BatchOptions): Promise<boolean>;

  // Content operations
  startContent(params: StartContentDto, options?: BatchOptions): Promise<boolean>;
  endContent(params: EndContentDto, options?: BatchOptions): Promise<boolean>;
  endAllContent(options?: BatchOptions): Promise<boolean>;
  goToStep(params: GoToStepDto, options?: BatchOptions): Promise<boolean>;

  // Question operations
  answerQuestion(params: AnswerQuestionDto, options?: BatchOptions): Promise<boolean>;

  // Checklist operations
  clickChecklistTask(params: ClickChecklistTaskDto, options?: BatchOptions): Promise<boolean>;
  hideChecklist(params: HideChecklistDto, options?: BatchOptions): Promise<boolean>;
  showChecklist(params: ShowChecklistDto, options?: BatchOptions): Promise<boolean>;

  // Resource center operations
  openResourceCenter(params: OpenResourceCenterDto, options?: BatchOptions): Promise<boolean>;
  closeResourceCenter(params: CloseResourceCenterDto, options?: BatchOptions): Promise<boolean>;
  clickResourceCenter(params: ClickResourceCenterDto, options?: BatchOptions): Promise<boolean>;
  listResourceCenterBlockContent(
    params: ListResourceCenterBlockContentDto,
  ): Promise<ResourceCenterBlockContentItem[]>;

  // Announcement operations
  listAnnouncements(): Promise<ListAnnouncementsResult>;
  getAnnouncement(params: GetAnnouncementDto): Promise<AnnouncementDetail | null>;
  markAnnouncementsSeen(params: MarkAnnouncementsSeenDto): Promise<boolean>;

  // Context and reporting
  updateClientContext(params: ClientContext, options?: BatchOptions): Promise<boolean>;
  reportTooltipTargetMissing(
    params: TooltipTargetMissingDto,
    options?: BatchOptions,
  ): Promise<boolean>;

  // Convenience methods

  // Connection management. Connection lifecycle is owned by the socket layer:
  // setAuth establishes/updates credentials and triggers a background connect
  // when needed; outgoing messages buffer through Socket.IO until the connect
  // resolves, with `EMIT_TIMEOUT` covering the no-connect-ever case.
  setAuth(externalUserId: string, token: string): void;
  disconnect(): void;
  isConnected(): boolean;
  isInBatch(): boolean;

  // Auth management
  updateCredentials(authInfo: Partial<SocketAuthData>): void;

  // Event management with acknowledgment support
  on(event: string, handler: (message: unknown) => boolean | Promise<boolean>): void;
  onQueue(event: string, handler: (message: unknown) => boolean | Promise<boolean>): void;
  off(event: string, handler?: (...args: any[]) => void): void;
  once(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Usertour Socket service that wraps all business-related socket operations
 * This should be a singleton shared across all components
 * Now manages the Socket lifecycle internally
 */
export class UsertourSocket implements IUsertourSocket {
  // === Properties ===
  private socket: Socket;
  private authCredentials: SocketAuthData | undefined;
  private inBatch = false;
  private readonly BATCH_TIMEOUT = 50; // ms
  private readonly BATCH_TIMEOUT_ID = 'socket-batch-timeout';
  private readonly CONNECT_TIMEOUT = 30000; // 30 seconds
  private readonly CONNECT_TIMEOUT_ID = 'socket-connect-timeout';
  // Per-emit ack timeout. Bounds how long an emit can sit unanswered when the
  // socket is buffering during a slow or failed connect; without this, an emit
  // queued before connect resolves would await its ack indefinitely.
  private readonly EMIT_TIMEOUT = 30000; // 30 seconds
  // Tracks an in-flight `socket.connect()`; prevents duplicate connect
  // attempts and lets `disconnect()` cancel the pending CONNECT_TIMEOUT.
  private connecting = false;
  // Reference to the active `connect` listener so we can detach it on
  // success, timeout, or external cancel.
  private connectListener: (() => void) | null = null;
  // Promise chain for serializing event handlers (especially SERVER_MESSAGE)
  private eventHandlerQueues = new Map<string, Promise<boolean>>();

  // === Constructor ===
  constructor() {
    // Create socket instance but don't auto-connect
    this.socket = new Socket({
      wsUri: getWsUri(),
      namespace: WEBSOCKET_NAMESPACES_V2,
      socketConfig: {
        autoConnect: false,
        // Use function for auth to ensure latest info on reconnection
        auth: (cb) => {
          cb(this.authCredentials || {});
        },
      },
    });
  }

  // === Connection Management ===
  /**
   * Establish (or update) the auth context and ensure the underlying socket is
   * connecting. Synchronous: any in-flight connect work runs in the
   * background. Callers must not depend on `setAuth` returning before the
   * socket is actually open — outgoing messages placed in
   * `sendClientMessage` will be buffered by Socket.IO and flushed in FIFO
   * order once the connect resolves, with `EMIT_TIMEOUT` covering the
   * no-connect-ever case.
   *
   * Behaviour:
   *  - First call / same credentials: stores credentials and kicks off a
   *    background connect when not already connected/connecting.
   *  - Different credentials: cancels any in-flight connect, disconnects the
   *    current socket, then starts a fresh connect with the new credentials.
   */
  setAuth(externalUserId: string, token: string): void {
    if (this.requiresReconnect(externalUserId, token)) {
      logger.info('Auth credentials changed, reconnecting socket...');
      this.resetBatchState();
      this.cancelConnecting();
      this.socket.disconnect();
    }

    this.authCredentials = { externalUserId, token, clientContext: getClientContext() };

    this.ensureConnecting();
  }

  /**
   * Start a background connect attempt if the socket is neither connected nor
   * already in the middle of connecting. Idempotent.
   *
   * Cleanup of the `connect` listener and CONNECT_TIMEOUT is centralized in
   * `cancelConnecting`, called both on success (via the listener) and on
   * timeout. This means a stale connect attempt cannot leave a listener or
   * timer hanging once cleared.
   */
  private ensureConnecting(): void {
    if (this.socket.isConnected() || this.connecting) {
      return;
    }
    this.connecting = true;

    const onConnect = () => this.cancelConnecting();
    this.connectListener = onConnect;

    this.socket.on('connect', onConnect);
    timerManager.setTimeout(
      this.CONNECT_TIMEOUT_ID,
      () => this.cancelConnecting(),
      this.CONNECT_TIMEOUT,
    );
    this.socket.connect();
  }

  /**
   * Tear down any in-flight connect-attempt state: clear the timeout, detach
   * the `connect` listener, and reset the `connecting` flag. Idempotent.
   */
  private cancelConnecting(): void {
    if (!this.connecting) {
      return;
    }
    this.connecting = false;
    timerManager.clearTimeout(this.CONNECT_TIMEOUT_ID);
    if (this.connectListener) {
      this.socket.off('connect', this.connectListener);
      this.connectListener = null;
    }
  }

  /**
   * Disconnect socket and clear auth credentials
   */
  disconnect(): void {
    logger.info('Disconnecting socket and clearing credentials...');
    // Clear event handler queues to prevent memory leaks
    this.eventHandlerQueues.clear();

    // Cancel any in-flight connect (clears CONNECT_TIMEOUT + connect listener)
    this.cancelConnecting();

    // Clear batch state and pending timeout
    this.resetBatchState();

    // Disconnect the socket
    this.socket.disconnect();

    // Clear auth credentials
    this.authCredentials = undefined;
  }

  // === Credential Management ===
  /**
   * Check if reconnection is required due to credential changes
   * @param externalUserId - The external user ID to check
   * @param token - The token to check
   * @returns True if credentials exist and are different from stored ones
   */
  private requiresReconnect(externalUserId: string, token: string): boolean {
    if (!this.authCredentials) {
      return false;
    }
    // Check if externalUserId or token has changed
    return (
      this.authCredentials.externalUserId !== externalUserId || this.authCredentials.token !== token
    );
  }

  // === Batch Management ===
  /**
   * Reset batch state without sending EndBatch message
   */
  private resetBatchState(): void {
    this.inBatch = false;
    timerManager.clearTimeout(this.BATCH_TIMEOUT_ID);
  }

  /**
   * Begin batch internally (send BeginBatch message)
   */
  private async beginBatchInternal(): Promise<void> {
    this.inBatch = true;
    await this.emitClientMessage(ClientMessageKind.BEGIN_BATCH);
  }

  /**
   * End batch and send EndBatch message
   * Always sends EndBatch to ensure toggleContents is triggered on server
   */
  private async endBatchInternal(): Promise<void> {
    if (!this.inBatch) return;
    this.inBatch = false;
    await this.emitClientMessage(ClientMessageKind.END_BATCH);
  }

  /**
   * Checks if socket is in batch mode
   */
  isInBatch(): boolean {
    return this.inBatch;
  }

  // === Message Sending ===
  /**
   * Emit a client message with unified error handling
   * Returns false on error, logs the error, and never throws
   */
  private async emitClientMessage(kind: ClientMessageKind, payload: any = {}): Promise<boolean> {
    if (!this.socket) return false;
    try {
      // EMIT_TIMEOUT bounds the await: when the socket is buffering during a
      // slow or failed connect, we surface that as a falsy result (caught
      // below) instead of hanging the caller indefinitely.
      const result = await this.socket.emitWithAck<boolean | undefined>(
        WebSocketEvents.CLIENT_MESSAGE,
        { kind, payload, requestId: uuidV4() },
        this.EMIT_TIMEOUT,
      );
      return result ?? false;
    } catch (error) {
      logger.error(`Failed to emit ${kind}:`, error);
      return false;
    }
  }

  /**
   * Send a client message with batch support
   */
  private async sendClientMessage(
    kind: ClientMessageKind,
    payload: any,
    options?: BatchOptions,
  ): Promise<boolean> {
    if (!this.socket) return false;

    // For batch messages, clear any pending timeout and ensure batch is started.
    // BEGIN_BATCH is fire-and-forget: TCP/Socket.IO ordering guarantees the
    // server receives BEGIN_BATCH before the message that follows on the same
    // socket, so awaiting its ack would only add a full RTT to every batch's
    // first message without buying anything.
    if (options?.batch) {
      timerManager.clearTimeout(this.BATCH_TIMEOUT_ID);
      if (!this.inBatch) {
        this.inBatch = true;
        void this.beginBatchInternal();
      }
    }

    // Send the message
    const result = await this.emitClientMessage(kind, payload);

    // Schedule batch end after message is sent (regardless of success/failure)
    // endBatchInternal triggers toggleContents which is needed even if some messages fail
    if (options?.batch) {
      timerManager.setTimeout(
        this.BATCH_TIMEOUT_ID,
        () => this.endBatchInternal(),
        this.BATCH_TIMEOUT,
      );
    }

    return result;
  }

  // === User and Company Operations ===
  async upsertUser(params: UpsertUserDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.UPSERT_USER, params, options);
  }

  async upsertCompany(params: UpsertCompanyDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.UPSERT_COMPANY, params, options);
  }

  // === Event Tracking ===
  async trackEvent(params: TrackEventDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.TRACK_EVENT, params, options);
  }

  // === Content Operations ===
  async startContent(params: StartContentDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.START_CONTENT, params, options);
  }

  async endContent(params: EndContentDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.END_CONTENT, params, options);
  }

  async endAllContent(options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.END_ALL_CONTENT, {}, options);
  }

  async goToStep(params: GoToStepDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.GO_TO_STEP, params, options);
  }

  // === Question Operations ===
  async answerQuestion(params: AnswerQuestionDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.ANSWER_QUESTION, params, options);
  }

  // === Checklist Operations ===
  async clickChecklistTask(
    params: ClickChecklistTaskDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.CLICK_CHECKLIST_TASK, params, options);
  }

  async hideChecklist(params: HideChecklistDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.HIDE_CHECKLIST, params, options);
  }

  async showChecklist(params: ShowChecklistDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.SHOW_CHECKLIST, params, options);
  }

  // === Context and Reporting ===
  async updateClientContext(params: ClientContext, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.UPDATE_CLIENT_CONTEXT, params, options);
  }

  async reportTooltipTargetMissing(
    params: TooltipTargetMissingDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.sendClientMessage(
      ClientMessageKind.REPORT_TOOLTIP_TARGET_MISSING,
      params,
      options,
    );
  }

  async toggleClientCondition(params: ClientCondition, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.TOGGLE_CLIENT_CONDITION, params, options);
  }

  async fireConditionWaitTimer(
    params: FireConditionWaitTimerDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.sendClientMessage(
      ClientMessageKind.FIRE_CONDITION_WAIT_TIMER,
      params,
      options,
    );
  }

  async activateLauncher(params: ActivateLauncherDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.ACTIVATE_LAUNCHER, params, options);
  }

  async dismissLauncher(params: DismissLauncherDto, options?: BatchOptions): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.DISMISS_LAUNCHER, params, options);
  }

  async trackTrackerEvent(params: TrackTrackerEventDto): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.TRACK_TRACKER_EVENT, params);
  }

  // === Resource Center Operations ===
  async openResourceCenter(
    params: OpenResourceCenterDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.OPEN_RESOURCE_CENTER, params, options);
  }

  async closeResourceCenter(
    params: CloseResourceCenterDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.CLOSE_RESOURCE_CENTER, params, options);
  }

  async clickResourceCenter(
    params: ClickResourceCenterDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.CLICK_RESOURCE_CENTER, params, options);
  }

  async listResourceCenterBlockContent(
    params: ListResourceCenterBlockContentDto,
  ): Promise<ResourceCenterBlockContentItem[]> {
    try {
      // EMIT_TIMEOUT bounds the ack so a mid-reconnect socket rejects instead of
      // hanging the caller forever (see listAnnouncements).
      const result = await this.socket?.emitWithAck(
        WebSocketEvents.CLIENT_MESSAGE,
        {
          kind: ClientMessageKind.LIST_RESOURCE_CENTER_BLOCK_CONTENT,
          payload: params,
          requestId: uuidV4(),
        },
        this.EMIT_TIMEOUT,
      );
      if (Array.isArray(result)) {
        return result as ResourceCenterBlockContentItem[];
      }
      return [];
    } catch (error) {
      logger.error('Failed to list resource center block content:', error);
      return [];
    }
  }

  async listAnnouncements(): Promise<ListAnnouncementsResult> {
    try {
      // EMIT_TIMEOUT bounds the ack (as emitClientMessage does) so a socket
      // buffering during a slow/failed reconnect rejects instead of leaving the
      // promise pending forever — which would hang the feed on 'Loading...'.
      const result = await this.socket?.emitWithAck(
        WebSocketEvents.CLIENT_MESSAGE,
        { kind: ClientMessageKind.LIST_ANNOUNCEMENTS, payload: {}, requestId: uuidV4() },
        this.EMIT_TIMEOUT,
      );
      if (result && typeof result === 'object' && 'announcements' in result) {
        return result as ListAnnouncementsResult;
      }
      return { announcements: [] };
    } catch (error) {
      logger.error('Failed to list announcements:', error);
      return { announcements: [] };
    }
  }

  async getAnnouncement(params: GetAnnouncementDto): Promise<AnnouncementDetail | null> {
    try {
      // EMIT_TIMEOUT bounds the ack so a mid-reconnect socket rejects instead of
      // hanging the detail view on 'Loading...' forever (see listAnnouncements).
      const result = await this.socket?.emitWithAck(
        WebSocketEvents.CLIENT_MESSAGE,
        { kind: ClientMessageKind.GET_ANNOUNCEMENT, payload: params, requestId: uuidV4() },
        this.EMIT_TIMEOUT,
      );
      if (result && typeof result === 'object' && 'id' in result) {
        return result as AnnouncementDetail;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get announcement:', error);
      return null;
    }
  }

  async markAnnouncementsSeen(params: MarkAnnouncementsSeenDto): Promise<boolean> {
    return await this.sendClientMessage(ClientMessageKind.MARK_ANNOUNCEMENTS_SEEN, params);
  }

  // === Status Methods ===
  /**
   * Checks if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.isConnected() ?? false;
  }

  // === Event Management ===
  /**
   * Register an event handler with acknowledgment support
   * @param event - The event name to handle
   * @param handler - Event handler function that returns boolean indicating success
   */
  on(event: string, handler: (message: unknown) => boolean | Promise<boolean>): void {
    this.socket?.on(event, async (message: unknown, callback: (success: boolean) => void) => {
      try {
        const result = await handler(message);
        callback?.(result);
      } catch (error) {
        logger.error(`Failed to process ${event}:`, error, message);
        callback?.(false);
      }
    });
  }

  /**
   * Register an event handler with queue-based execution support
   * Handlers are queued and executed sequentially to maintain message order
   *
   * ARCHITECTURE NOTE: To prevent deadlocks, this method uses "fire-and-forget ACK" pattern:
   * - ACK is returned immediately (indicating message received)
   * - Message processing happens asynchronously in queue
   * - This breaks the circular await dependency between server and SDK:
   *   Server waiting for SDK ACK -> SDK handler sending message -> Server queue blocked
   *
   * @param event - The event name to handle
   * @param handler - Event handler function that returns boolean indicating success
   */
  onQueue(event: string, handler: (message: unknown) => boolean | Promise<boolean>): void {
    this.socket?.on(event, (message: unknown, callback: (success: boolean) => void) => {
      // CRITICAL: Return ACK immediately to prevent deadlock
      // This breaks the circular dependency: server won't block waiting for SDK processing
      callback?.(true);

      // Process message asynchronously in queue
      this.executeHandlerInOrder(event, () => handler(message)).catch((error) => {
        logger.error(`Failed to process ${event}:`, error, message);
      });
    });
  }

  /**
   * Execute handler in order for events that require serial processing
   * @param event - The event name
   * @param handler - The handler function to execute
   * @returns Promise<boolean> - The result of the handler
   */
  private async executeHandlerInOrder(
    event: string,
    handler: () => boolean | Promise<boolean>,
  ): Promise<boolean> {
    // Get the last task in the queue for this event (or resolved promise if queue is empty)
    const lastTask = this.eventHandlerQueues.get(event) || Promise.resolve(true);

    // Create a new task that waits for the last task to complete
    // Ensure handler result is always a Promise
    const newTask = lastTask
      .then(() => Promise.resolve(handler()))
      .catch((err) => {
        logger.warn(`Previous ${event} handler failed, continuing with next:`, err?.message);
        return Promise.resolve(handler());
      })
      .catch((err) => {
        logger.error(`${event} handler execution failed:`, err);
        return false;
      });

    // Update the queue with the new task
    this.eventHandlerQueues.set(event, newTask);

    // Cleanup: Remove from queue when this task completes and no new tasks were added
    newTask.finally(() => {
      if (this.eventHandlerQueues.get(event) === newTask) {
        this.eventHandlerQueues.delete(event);
      }
    });

    return newTask;
  }

  off(event: string, handler?: (...args: any[]) => void): void {
    this.socket?.off(event, handler);
  }

  once(event: string, handler: (...args: any[]) => void): void {
    this.socket?.once(event, handler);
  }

  // === Auth Management ===
  /**
   * Updates socket authentication credentials
   */
  updateCredentials(authInfo: Partial<SocketAuthData>): void {
    if (!this.socket) {
      logger.warn('Socket not initialized. Cannot update auth.');
      return;
    }

    // Update current auth info - the callback will use this on reconnection
    if (this.authCredentials) {
      this.authCredentials = {
        ...this.authCredentials,
        ...authInfo,
      };
    }
  }
}
