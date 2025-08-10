import {
  ManagerOptions,
  Socket as SocketIO,
  SocketOptions as SocketIOOptions,
  io,
} from 'socket.io-client';
import { autoBind } from '@/utils';
import { Evented } from './evented';
import { SDKContentSession } from '../types/sdk';
import {
  UpdateClientContextDto,
  AnswerQuestionDto,
  ClickChecklistTaskDto,
  EndFlowDto,
  GoToStepDto,
  HideChecklistDto,
  ShowChecklistDto,
  StartFlowDto,
  TrackEventDto,
  UpsertCompanyDto,
  UpsertUserDto,
  TooltipTargetMissingDto,
} from '@/types/web-socket';

// Configuration options for Socket connection
interface SocketOptions {
  wsUri: string;
  /**
   * Optional Socket.IO namespace, e.g. '/v2'.
   * If omitted, connects to the root namespace ('/').
   * Note: This is different from Socket.IO 'path' which controls the HTTP handshake path.
   */
  namespace?: string;
  socketConfig?: Partial<ManagerOptions & SocketIOOptions>;
}

/**
 * Socket class for handling real-time communication
 * Extends Evented to support event-based communication
 */
export class Socket extends Evented {
  private readonly socket: SocketIO;
  private readonly options: SocketOptions;
  private inBatch = false;
  private endBatchTimeout?: number;
  private readonly BATCH_TIMEOUT = 100; // ms

  constructor(options: SocketOptions) {
    super();
    autoBind(this);

    // Resolve the WebSocket URI
    const resolvedUrl = new URL(options.wsUri, window.location.origin);
    const baseUri = resolvedUrl.origin;

    // Normalize the base path
    let basePath = resolvedUrl.pathname;
    if (basePath !== '/' && basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }
    if (basePath === '/') {
      basePath = '';
    }

    // Configure Socket.IO path
    const ioPathSegment = (options.socketConfig?.path || '/socket.io/').replace(/^\/+|\/+$/g, '');

    // Initialize socket configuration
    this.options = {
      ...options,
      socketConfig: {
        withCredentials: false,
        timeout: 5000,
        reconnection: true,
        transports: ['websocket'],
        path: `${basePath}/${ioPathSegment}/`,
        ...options.socketConfig,
      },
    };

    // Normalize namespace to ensure it starts with '/' and has no trailing '/'
    const namespace = (options.namespace ?? '').trim();
    const normalizedNamespace = namespace ? `/${namespace.replace(/^\/+|\/+$/g, '')}` : '';

    // Connect to namespace while keeping the HTTP handshake path configured via 'path'
    this.socket = io(`${baseUri}${normalizedNamespace}`, this.options.socketConfig);

    this.setupEventListener();
  }

  /**
   * Setup content changed listener
   */
  private setupEventListener(): void {
    this.socket.on('connect_error', (error) => {
      this.trigger('error', error);
    });
    this.socket.on('set-flow-session', (message: SDKContentSession) => {
      this.trigger('set-flow-session', message);
    });
    this.socket.on('set-checklist-session', (message: SDKContentSession) => {
      this.trigger('set-checklist-session', message);
    });
  }

  /**
   * Send message with batch support (similar to userflow implementation)
   * @param event - Event name to emit
   * @param data - Data to send with the event
   * @param options - Batch options
   * @returns Promise with the response
   */
  async send<T>(
    event: string,
    data: any,
    { batch = false, endBatch = false }: { batch?: boolean; endBatch?: boolean } = {},
  ): Promise<T> {
    // Start batch if requested and not already in batch
    if (batch && !this.inBatch) {
      this.inBatch = true;
      await this.emitWithTimeout('begin-batch', {});
    }

    // Handle batch timeout
    if (this.inBatch) {
      // Clear existing timeout
      if (this.endBatchTimeout) {
        window.clearTimeout(this.endBatchTimeout);
      }

      if (endBatch) {
        // End batch immediately
        await this.endBatch();
      } else {
        // Set timeout to auto-end batch
        this.endBatchTimeout = window.setTimeout(() => {
          this.endBatch();
        }, this.BATCH_TIMEOUT);
      }
    }

    // Send the actual message
    return await this.emitWithTimeout<T>(event, data);
  }

  /**
   * End current batch
   */
  async endBatch(): Promise<void> {
    if (this.inBatch) {
      this.inBatch = false;
      if (this.endBatchTimeout) {
        window.clearTimeout(this.endBatchTimeout);
        this.endBatchTimeout = undefined;
      }
      await this.emitWithTimeout('end-batch', {});
    }
  }

  /**
   * Emit an event and wait for acknowledgment (internal method)
   * @param event - Event name to emit
   * @param data - Data to send with the event
   * @returns Promise with the response
   */
  private async emitWithTimeout<T>(event: string, data: any): Promise<T> {
    try {
      return await this.socket.emitWithAck(event, data);
    } catch (error) {
      this.trigger('error', error);
      throw error;
    }
  }

  /**
   * Create or update user information
   * @param params - User parameters including userId, attributes, and token
   * @param options - Batch options
   * @returns Promise with user information
   */
  async upsertUser(
    params: UpsertUserDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('upsert-user', params, options);
  }

  /**
   * Create or update company information
   * @param options - Batch options
   * @returns Promise with company information
   */
  async upsertCompany(
    params: UpsertCompanyDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('upsert-company', params, options);
  }

  /**
   * Track an event
   * @param params - Event tracking parameters
   * @param options - Batch options
   */
  async trackEvent(
    params: TrackEventDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('track-event', params, options);
  }

  /**
   * Start a flow with optional step index
   * @param contentId - Content ID to start
   * @param stepIndex - Optional step index to start from
   * @param options - Batch options
   */
  async startFlow(
    params: StartFlowDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('start-flow', params, options);
  }

  /**
   * End a flow session
   * @param sessionId - Session ID to end
   * @param reason - Reason for ending the flow
   * @param options - Batch options
   */
  async endFlow(
    params: EndFlowDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('end-flow', params, options);
  }

  /**
   * Go to a specific step in a flow
   * @param sessionId - Session ID
   * @param stepId - Step ID to navigate to
   * @param options - Batch options
   */
  async goToStep(
    params: GoToStepDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('go-to-step', params, options);
  }

  /**
   * Answer a question in a flow
   * @param questionCvid - Question content version ID
   * @param questionName - Question name
   * @param questionType - Question type
   * @param sessionId - Session ID
   * @param listAnswer - Answer for list type questions
   * @param numberAnswer - Answer for number type questions
   * @param textAnswer - Answer for text type questions
   * @param options - Batch options
   */
  async answerQuestion(
    params: AnswerQuestionDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('answer-question', params, options);
  }

  /**
   * Click a checklist task
   * @param sessionId - Session ID
   * @param taskId - Task ID to click
   * @param options - Batch options
   */
  async clickChecklistTask(
    params: ClickChecklistTaskDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('click-checklist-task', params, options);
  }

  /**
   * Hide checklist
   * @param sessionId - Session ID
   * @param options - Batch options
   */
  async hideChecklist(
    params: HideChecklistDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('hide-checklist', params, options);
  }

  /**
   * Show checklist
   * @param sessionId - Session ID
   * @param options - Batch options
   */
  async showChecklist(
    params: ShowChecklistDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('show-checklist', params, options);
  }

  /**
   * Update client context (viewport, page URL, etc.)
   * @param pageUrl - Current page URL
   * @param viewportWidth - Viewport width
   * @param viewportHeight - Viewport height
   * @param options - Batch options
   */
  async updateClientContext(
    params: UpdateClientContextDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('update-client-context', params, options);
  }

  async reportTooltipTargetMissing(
    params: TooltipTargetMissingDto,
    options?: { batch?: boolean; endBatch?: boolean },
  ): Promise<boolean> {
    return await this.send('report-tooltip-target-missing', params, options);
  }

  /**
   * Disconnect the socket connection
   */
  disconnect(): void {
    this.socket.disconnect();
  }

  /**
   * Connect the socket (if disconnected)
   */
  connect(): void {
    this.socket.connect();
  }

  /**
   * Check if socket is currently connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.socket.connected;
  }

  /**
   * Check if currently in a batch
   * @returns True if in batch mode, false otherwise
   */
  isInBatch(): boolean {
    return this.inBatch;
  }
}
