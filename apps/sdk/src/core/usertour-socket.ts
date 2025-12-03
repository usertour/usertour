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
  ClientCondition,
  WebSocketEvents,
  ClientMessageKind,
  SocketAuthData,
} from '@usertour/types';
import { Socket, logger, window } from '@/utils';
import { getWsUri } from '@/core/usertour-env';
import { WEBSOCKET_NAMESPACES_V2 } from '@usertour-packages/constants';
import { getClientContext } from '@/core/usertour-helper';
import { uuidV4 } from '@usertour/helpers';

// === Interfaces ===
// Batch options interface for consistency
export interface BatchOptions {
  batch?: boolean;
  endBatch?: boolean;
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

  // Context and reporting
  updateClientContext(params: ClientContext, options?: BatchOptions): Promise<boolean>;
  reportTooltipTargetMissing(
    params: TooltipTargetMissingDto,
    options?: BatchOptions,
  ): Promise<boolean>;

  // Convenience methods

  // Connection management
  connect(externalUserId: string, token: string): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  isInBatch(): boolean;
  endBatch(): Promise<void>;

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
  private endBatchTimeout?: number;
  private readonly BATCH_TIMEOUT = 50; // ms
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
   * Connect Socket with given credentials
   */
  async connect(externalUserId: string, token: string): Promise<boolean> {
    try {
      // Check if credentials changed
      if (this.requiresReconnect(externalUserId, token)) {
        return await this.reconnectWithNewCredentials(externalUserId, token);
      }

      // If credentials haven't changed and already connected, no action needed
      if (this.isConnected()) {
        return true;
      }

      // Set credentials and connect
      this.authCredentials = { externalUserId, token, clientContext: getClientContext() };

      // Connect and wait for connection result
      return await this.connectWithPromise();
    } catch (error) {
      logger.error('Failed to connect socket:', error);
      return false;
    }
  }

  /**
   * Connect socket and return a promise that resolves when connection is established
   */
  private connectWithPromise(): Promise<boolean> {
    return new Promise((resolve) => {
      // Set up one-time event listeners
      const onConnect = () => {
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onConnectError);
        resolve(true);
      };

      const onConnectError = (error: Error) => {
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onConnectError);
        logger.error('Socket connection failed:', error);
        resolve(false);
      };

      // Listen for connection events
      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onConnectError);

      // Start connection
      this.socket.connect();
    });
  }

  /**
   * Disconnect socket and clear auth credentials
   */
  disconnect(): void {
    logger.info('Disconnecting socket and clearing credentials...');
    // Clear event handler queues to prevent memory leaks
    this.eventHandlerQueues.clear();

    // Disconnect the socket
    this.socket.disconnect();

    // Clear auth credentials
    this.authCredentials = undefined;
  }

  // === Credential Management ===
  /**
   * Reconnect socket with new credentials
   */
  private async reconnectWithNewCredentials(
    externalUserId: string,
    token: string,
  ): Promise<boolean> {
    logger.info('Credentials changed, reconnecting socket...');

    // Disconnect first
    this.socket.disconnect();

    // Update credentials after disconnect
    this.authCredentials = { externalUserId, token, clientContext: getClientContext() };

    // Connect with new credentials
    return await this.connectWithPromise();
  }

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
   * Begin batch internally (send BeginBatch message)
   */
  private async beginBatchInternal(): Promise<void> {
    this.inBatch = true;
    await this.socket.emitWithAck(WebSocketEvents.CLIENT_MESSAGE, {
      kind: ClientMessageKind.BEGIN_BATCH,
      payload: {},
      requestId: uuidV4(),
    });
  }

  /**
   * End batch and send EndBatch message
   */
  async endBatch(): Promise<void> {
    if (this.inBatch) {
      this.inBatch = false;
      if (this.endBatchTimeout && window) {
        window.clearTimeout(this.endBatchTimeout);
        this.endBatchTimeout = undefined;
      }
      await this.socket.emitWithAck(WebSocketEvents.CLIENT_MESSAGE, {
        kind: ClientMessageKind.END_BATCH,
        payload: {},
        requestId: uuidV4(),
      });
    }
  }

  /**
   * Checks if socket is in batch mode
   */
  isInBatch(): boolean {
    return this.inBatch;
  }

  // === Message Sending ===
  /**
   * Send a client message with unified format
   */
  private async sendClientMessage(
    kind: ClientMessageKind,
    payload: any,
    options?: BatchOptions,
  ): Promise<boolean> {
    if (!this.socket) return false;

    // Handle batch options
    if (options?.batch && !this.inBatch) {
      await this.beginBatchInternal();
    }

    if (this.inBatch) {
      // Clear existing timeout
      if (this.endBatchTimeout && window) {
        window.clearTimeout(this.endBatchTimeout);
      }

      if (options?.endBatch) {
        // End batch immediately after sending this message
        const result = (await this.socket.emitWithAck(WebSocketEvents.CLIENT_MESSAGE, {
          kind,
          payload,
          requestId: uuidV4(),
        })) as boolean;
        await this.endBatch();
        return result;
      }

      // Set timeout to auto-end batch
      if (window) {
        this.endBatchTimeout = window.setTimeout(() => {
          this.endBatch();
        }, this.BATCH_TIMEOUT);
      }
    }

    return await this.socket.emitWithAck(WebSocketEvents.CLIENT_MESSAGE, {
      kind,
      payload,
      requestId: uuidV4(),
    });
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
   * @param event - The event name to handle
   * @param handler - Event handler function that returns boolean indicating success
   */
  onQueue(event: string, handler: (message: unknown) => boolean | Promise<boolean>): void {
    this.socket?.on(event, async (message: unknown, callback: (success: boolean) => void) => {
      try {
        const result = await this.executeHandlerInOrder(event, () => handler(message));
        callback?.(result);
      } catch (error) {
        logger.error(`Failed to process ${event}:`, error, message);
        callback?.(false);
      }
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
      console.warn('Socket not initialized. Cannot update auth.');
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
