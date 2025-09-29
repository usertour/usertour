import { ClientContext } from '@usertour/types';
import {
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
} from '@/types/websocket';

import { Socket, logger } from '@/utils';
import { ClientCondition } from '@/types/sdk';
import { getWsUri } from '@/core/usertour-env';
import { WebSocketEvents } from '@/types';
import { WEBSOCKET_NAMESPACES_V2 } from '@usertour-packages/constants';
import { getClientContext } from '@/core/usertour-helper';

// Batch options interface for consistency
export interface BatchOptions {
  batch?: boolean;
  endBatch?: boolean;
}

// Auth credentials for authentication
export interface AuthCredentials {
  externalUserId: string;
  externalCompanyId?: string;
  token: string;
  clientContext?: ClientContext;
  clientConditions?: ClientCondition[];
  flowSessionId?: string;
  checklistSessionId?: string;
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
  updateCredentials(authInfo: Partial<AuthCredentials>): void;

  // Event management with acknowledgment support
  on(event: string, handler: (message: unknown) => boolean | Promise<boolean>): void;
  off(event: string, handler?: (...args: any[]) => void): void;
  once(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Usertour Socket service that wraps all business-related socket operations
 * This should be a singleton shared across all components
 * Now manages the Socket lifecycle internally
 */
export class UsertourSocket implements IUsertourSocket {
  private socket: Socket;
  private authCredentials: AuthCredentials | undefined;

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

  /**
   * Connect Socket with given credentials
   */
  async connect(externalUserId: string, token: string): Promise<boolean> {
    try {
      // Check if credentials changed
      if (this.credentialsChanged(externalUserId, token)) {
        this.handleCredentialChange(externalUserId, token);
        return true;
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

    // Disconnect the socket
    this.socket.disconnect();

    // Clear auth credentials
    this.authCredentials = undefined;
  }

  /**
   * Handle credential change by reconnecting with new credentials
   */
  private handleCredentialChange(externalUserId: string, token: string): void {
    logger.info('Credentials changed, reconnecting socket...');

    // Disconnect first
    this.socket.disconnect();

    // Update credentials after disconnect
    this.authCredentials = { externalUserId, token, clientContext: getClientContext() };

    // Connect with new credentials
    this.socket.connect();
  }

  /**
   * Check if credentials have changed
   */
  private credentialsChanged(externalUserId: string, token: string): boolean {
    if (!this.socket || !this.authCredentials) {
      return false;
    }

    // Check if externalUserId or token has changed
    return (
      this.authCredentials.externalUserId !== externalUserId || this.authCredentials.token !== token
    );
  }

  // User and Company operations
  async upsertUser(params: UpsertUserDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.UPSERT_USER, params, options);
  }

  async upsertCompany(params: UpsertCompanyDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.UPSERT_COMPANY, params, options);
  }

  // Event tracking
  async trackEvent(params: TrackEventDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.TRACK_EVENT, params, options);
  }

  // Content operations
  async startContent(params: StartContentDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.START_CONTENT, params, options);
  }

  async endContent(params: EndContentDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.END_CONTENT, params, options);
  }

  async goToStep(params: GoToStepDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.GO_TO_STEP, params, options);
  }

  // Question operations
  async answerQuestion(params: AnswerQuestionDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.ANSWER_QUESTION, params, options);
  }

  // Checklist operations
  async clickChecklistTask(
    params: ClickChecklistTaskDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.CLICK_CHECKLIST_TASK, params, options);
  }

  async hideChecklist(params: HideChecklistDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.HIDE_CHECKLIST, params, options);
  }

  async showChecklist(params: ShowChecklistDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.SHOW_CHECKLIST, params, options);
  }

  // Context and reporting
  async updateClientContext(params: ClientContext, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.UPDATE_CLIENT_CONTEXT, params, options);
  }

  async reportTooltipTargetMissing(
    params: TooltipTargetMissingDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.REPORT_TOOLTIP_TARGET_MISSING, params, options);
  }

  async toggleClientCondition(params: ClientCondition, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.TOGGLE_CLIENT_CONDITION, params, options);
  }

  async fireConditionWaitTimer(
    params: FireConditionWaitTimerDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.FIRE_CONDITION_WAIT_TIMER, params, options);
  }

  // Socket status methods
  isConnected(): boolean {
    return this.socket?.isConnected() ?? false;
  }

  isInBatch(): boolean {
    return this.socket?.isInBatch() ?? false;
  }

  async endBatch(): Promise<void> {
    await this.socket?.endBatch();
  }

  /**
   * Register an event handler with acknowledgment support
   * @param event - The event name to handle
   * @param handler - Event handler function that returns boolean indicating success
   */
  on(event: string, handler: (message: unknown) => boolean | Promise<boolean>): void {
    this.socket?.on(event, async (message: unknown, callback: (success: boolean) => void) => {
      try {
        const result = await handler(message);
        callback(result);
      } catch (error) {
        logger.error(`Failed to process ${event}:`, error);
        callback(false);
      }
    });
  }

  off(event: string, handler?: (...args: any[]) => void): void {
    this.socket?.off(event, handler);
  }

  once(event: string, handler: (...args: any[]) => void): void {
    this.socket?.once(event, handler);
  }

  // Auth management
  updateCredentials(authInfo: Partial<AuthCredentials>): void {
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
