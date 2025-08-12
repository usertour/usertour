import { contentEndReason, EventAttributes } from '@usertour/types';
import {
  AnswerQuestionDto,
  UpsertUserDto,
  UpsertCompanyDto,
  TrackEventDto,
  StartFlowDto,
  EndFlowDto,
  GoToStepDto,
  ClickChecklistTaskDto,
  HideChecklistDto,
  ShowChecklistDto,
  UpdateClientContextDto,
  TooltipTargetMissingDto,
} from '@/types/websocket';
import { Socket, Evented, window } from '@/utils';
import { SDKContentSession } from '@/types/sdk';
import { getWsUri } from '@/core/usertour-env';
import { WebSocketEvents } from '@/types';
import { WEBSOCKET_NAMESPACES_V2 } from '@usertour-packages/constants';

// Batch options interface for consistency
export interface BatchOptions {
  batch?: boolean;
  endBatch?: boolean;
}

// Socket initialization options
export interface SocketInitOptions {
  userId: string;
  token: string;
  wsUri?: string;
  namespace?: string;
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

  // Flow operations
  startFlow(params: StartFlowDto, options?: BatchOptions): Promise<boolean>;
  endFlow(params: EndFlowDto, options?: BatchOptions): Promise<boolean>;
  goToStep(params: GoToStepDto, options?: BatchOptions): Promise<boolean>;

  // Question operations
  answerQuestion(params: AnswerQuestionDto, options?: BatchOptions): Promise<boolean>;

  // Checklist operations
  clickChecklistTask(params: ClickChecklistTaskDto, options?: BatchOptions): Promise<boolean>;
  hideChecklist(params: HideChecklistDto, options?: BatchOptions): Promise<boolean>;
  showChecklist(params: ShowChecklistDto, options?: BatchOptions): Promise<boolean>;

  // Context and reporting
  updateClientContext(params: UpdateClientContextDto, options?: BatchOptions): Promise<boolean>;
  reportTooltipTargetMissing(
    params: TooltipTargetMissingDto,
    options?: BatchOptions,
  ): Promise<boolean>;

  // Convenience methods
  reportStepSeen(sessionId: string, stepId: string, options?: BatchOptions): Promise<boolean>;
  reportCloseEvent(
    sessionId: string,
    reason: contentEndReason,
    options?: BatchOptions,
  ): Promise<boolean>;
  reportTargetMissing(sessionId: string, stepId: string, options?: BatchOptions): Promise<boolean>;

  // Connection management
  initialize(options: SocketInitOptions): Promise<void>;
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;
  isInBatch(): boolean;
  endBatch(): Promise<void>;

  // Event management - delegate to underlying Socket
  addEventListener(event: string, handler: (...args: any[]) => void): void;
  removeEventListener(event: string, handler?: (...args: any[]) => void): void;
  addOnceEventListener(event: string, handler: (...args: any[]) => void): void;
  emitEvent(event: string, ...args: any[]): void;
}

/**
 * Usertour Socket service that wraps all business-related socket operations
 * This should be a singleton shared across all components
 * Now manages the Socket lifecycle internally
 */
export class UsertourSocket extends Evented implements IUsertourSocket {
  private socket: Socket | undefined;
  private currentAuth: { userId: string; token: string } | undefined;

  /**
   * Initialize Socket connection with given credentials
   */
  async initialize(options: SocketInitOptions): Promise<void> {
    const { userId, token, wsUri = getWsUri(), namespace = WEBSOCKET_NAMESPACES_V2 } = options;

    // Check if Socket connection needs to be recreated
    if (this.shouldRecreateSocket(userId, token)) {
      this.disconnect();
    }

    if (!this.socket) {
      this.socket = new Socket({
        wsUri,
        namespace,
        socketConfig: {
          auth: {
            token,
            externalUserId: userId,
            clientContext: {
              [EventAttributes.PAGE_URL]: window?.location?.href,
              [EventAttributes.VIEWPORT_WIDTH]: window?.innerWidth,
              [EventAttributes.VIEWPORT_HEIGHT]: window?.innerHeight,
            },
          },
        },
      });

      // Store current connection auth info for comparison
      this.currentAuth = { userId, token };

      // Setup business-specific event listeners
      this.setupBusinessEventListeners();
    }
  }

  /**
   * Setup business-specific event listeners
   * Handles events like set-flow-session, set-checklist-session
   */
  private setupBusinessEventListeners(): void {
    if (!this.socket) return;

    // Listen for flow session events from Socket.IO
    this.socket.on(WebSocketEvents.SET_FLOW_SESSION, (message: unknown) => {
      this.trigger(WebSocketEvents.SET_FLOW_SESSION, message as SDKContentSession);
    });

    // Listen for checklist session events from Socket.IO
    this.socket.on(WebSocketEvents.SET_CHECKLIST_SESSION, (message: unknown) => {
      this.trigger(WebSocketEvents.SET_CHECKLIST_SESSION, message as SDKContentSession);
    });
  }

  /**
   * Check if Socket connection needs to be recreated due to credential changes
   */
  private shouldRecreateSocket(userId: string, token: string): boolean {
    if (!this.socket || !this.currentAuth) {
      return false;
    }

    // Recreate if userId or token has changed
    return this.currentAuth.userId !== userId || this.currentAuth.token !== token;
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

  // Flow operations
  async startFlow(params: StartFlowDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.START_FLOW, params, options);
  }

  async endFlow(params: EndFlowDto, options?: BatchOptions): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.END_FLOW, params, options);
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
  async updateClientContext(
    params: UpdateClientContextDto,
    options?: BatchOptions,
  ): Promise<boolean> {
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

  // Convenience methods for common operations
  async reportStepSeen(
    sessionId: string,
    stepId: string,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.goToStep({ sessionId, stepId }, options);
  }

  async reportCloseEvent(
    sessionId: string,
    reason: contentEndReason,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.endFlow({ sessionId, reason }, options);
  }

  async reportTargetMissing(
    sessionId: string,
    stepId: string,
    options?: BatchOptions,
  ): Promise<boolean> {
    return await this.reportTooltipTargetMissing({ sessionId, stepId }, options);
  }

  // Socket connection management
  connect(): void {
    this.socket?.connect();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      this.currentAuth = undefined;
    }
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

  // Socket.IO event listener management - delegate to underlying Socket
  addEventListener(event: string, handler: (...args: any[]) => void): void {
    this.socket?.on(event, handler);
  }

  removeEventListener(event: string, handler?: (...args: any[]) => void): void {
    this.socket?.off(event, handler);
  }

  addOnceEventListener(event: string, handler: (...args: any[]) => void): void {
    this.socket?.once(event, handler);
  }

  emitEvent(event: string, ...args: any[]): void {
    // This triggers Evented events, not Socket.IO events
    this.trigger(event, ...args);
  }
}
