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
  FireWaitTimerConditionDto,
} from '@/types/websocket';
import { Socket, Evented } from '@/utils';
import {
  SDKContentSession,
  TrackCondition,
  UnTrackedCondition,
  WaitTimerCondition,
  ClientCondition,
} from '@/types/sdk';
import { getWsUri } from '@/core/usertour-env';
import { WebSocketEvents } from '@/types';
import { WEBSOCKET_NAMESPACES_V2 } from '@usertour-packages/constants';
import { getClientContext } from '@/core/usertour-helper';

// Batch options interface for consistency
export interface BatchOptions {
  batch?: boolean;
  endBatch?: boolean;
}

// Socket initialization options
export interface SocketInitOptions {
  externalUserId: string;
  token: string;
  wsUri?: string;
  namespace?: string;
}

// Auth credentials for authentication
export interface AuthCredentials {
  externalUserId: string;
  token: string;
  clientContext?: ClientContext;
  clientConditions?: ClientCondition[];
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
  initialize(options: SocketInitOptions): Promise<void>;
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;
  isInBatch(): boolean;
  endBatch(): Promise<void>;

  // Auth management
  updateCredentials(authInfo: Partial<AuthCredentials>): void;

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
  private authCredentials: AuthCredentials | undefined;

  /**
   * Initialize Socket connection with given credentials
   */
  async initialize(options: SocketInitOptions): Promise<void> {
    const {
      externalUserId,
      token,
      wsUri = getWsUri(),
      namespace = WEBSOCKET_NAMESPACES_V2,
    } = options;

    // Check if Socket connection needs to be recreated
    if (this.shouldRecreateSocket(externalUserId, token)) {
      this.disconnect();
    }

    if (!this.socket) {
      const clientContext: ClientContext = getClientContext();

      // Store current connection auth info for comparison
      this.authCredentials = { externalUserId, token, clientContext };

      this.socket = new Socket({
        wsUri,
        namespace,
        socketConfig: {
          // Use function for auth to ensure latest info on reconnection
          auth: (cb) => {
            cb(this.authCredentials || {});
          },
        },
      });

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

    // Listen for track client condition events from Socket.IO
    this.socket.on(WebSocketEvents.TRACK_CLIENT_CONDITION, (message: unknown) => {
      this.trigger(WebSocketEvents.TRACK_CLIENT_CONDITION, message as TrackCondition);
    });

    // Listen for untrack client condition events from Socket.IO
    this.socket.on(WebSocketEvents.UNTRACK_CLIENT_CONDITION, (message: unknown) => {
      this.trigger(WebSocketEvents.UNTRACK_CLIENT_CONDITION, message as UnTrackedCondition);
    });

    // Listen for start condition wait timer events from Socket.IO
    this.socket.on(WebSocketEvents.START_CONDITION_WAIT_TIMER, (message: unknown) => {
      this.trigger(WebSocketEvents.START_CONDITION_WAIT_TIMER, message as WaitTimerCondition);
    });

    // Listen for cancel condition wait timer events from Socket.IO
    this.socket.on(WebSocketEvents.CANCEL_CONDITION_WAIT_TIMER, (message: unknown) => {
      this.trigger(WebSocketEvents.CANCEL_CONDITION_WAIT_TIMER, message as WaitTimerCondition);
    });
  }

  /**
   * Check if Socket connection needs to be recreated due to credential changes
   */
  private shouldRecreateSocket(externalUserId: string, token: string): boolean {
    if (!this.socket || !this.authCredentials) {
      return false;
    }

    // Recreate if externalUserId or token has changed
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

  async fireWaitTimerCondition(
    params: FireWaitTimerConditionDto,
    options?: BatchOptions,
  ): Promise<boolean> {
    if (!this.socket) return false;
    return await this.socket.send(WebSocketEvents.FIRE_CONDITION_WAIT_TIMER, params, options);
  }

  // Socket connection management
  connect(): void {
    this.socket?.connect();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      this.authCredentials = undefined;
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
