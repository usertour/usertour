import { Injectable, Logger, Optional } from '@nestjs/common';
import { AdmissionService, AdmissionTimeoutError } from './admission.service';

// ============================================================================
// Socket Message Queue Service
// ============================================================================

/**
 * Socket message queue service
 * Ensures messages for each socket are processed in order using Promise chains
 *
 * How it works:
 * - Each socket has its own Promise chain stored in memory
 * - New tasks wait for the previous task to complete before executing
 * - This ensures strict ordering for messages from the same socket
 * - Different sockets have independent queues and don't block each other
 * - Across sockets, a task runs only once the replica's admission gate
 *   (AdmissionService) has a slot for it, so a burst of connections cannot
 *   start hundreds of tasks at once
 */
@Injectable()
export class SocketMessageQueueService {
  private readonly logger = new Logger(SocketMessageQueueService.name);

  constructor(@Optional() private readonly admission?: AdmissionService) {}

  // Map: socketId -> Promise chain
  // Each socket has its own Promise chain for ordered execution
  private queues = new Map<string, Promise<any>>();

  // ============================================================================
  // Public API Methods - Queue Management
  // ============================================================================

  /**
   * Execute task in order for a specific socket
   *
   * @param socketId - The socket ID
   * @param task - The async task to execute
   * @param timeoutMs - Task timeout in milliseconds (default: 10000)
   * @returns Promise that resolves with the task result
   *
   * Example flow:
   * 1. Message 1 arrives -> No queue exists -> Execute immediately
   * 2. Message 2 arrives (Message 1 still running) -> Add to chain -> Wait
   * 3. Message 1 completes -> Message 2 starts automatically
   */
  async executeInOrder<T>(socketId: string, task: () => Promise<T>, timeoutMs = 10000): Promise<T> {
    // Get the last task in the queue for this socket
    // If no queue exists, use a resolved Promise (executes immediately)
    const lastTask = this.queues.get(socketId) || Promise.resolve();

    // A failed or timed-out predecessor must not block the socket, so its
    // rejection is absorbed and this task runs regardless. This task's own
    // failure — its timeout included — propagates as it is: running it a
    // second time while the first run may still be executing would apply
    // a write twice (an `add` doubled, ADR 0017 §5).
    //
    // The task's timeout starts when it is admitted, not while it waits for
    // a slot: queueing under a burst is the gate's job, and a wait it refuses
    // (AdmissionTimeoutError) never ran the task at all. The timeout bounds
    // the answer only; the slot stays taken until the task itself settles,
    // or a slow database would let more tasks run than the gate allows.
    const run = () => {
      if (!this.admission) {
        return this.withTimeout(task(), timeoutMs, socketId);
      }
      return new Promise<T>((resolve, reject) => {
        this.admission
          .run(
            () => {
              const running = task();
              this.withTimeout(running, timeoutMs, socketId).then(resolve, reject);
              return running.then(
                () => undefined,
                () => undefined,
              );
            },
            this.admission.messageWaitMs,
            `message on ${socketId}`,
          )
          .catch(reject);
      });
    };
    const newTask = lastTask
      .then(run, (err) => {
        this.logger.warn(`Previous task failed for socket ${socketId}; continuing:`, err?.message);
        return run();
      })
      .catch((err) => {
        // A refusal at the gate is not a failure of the task: it never ran.
        if (!(err instanceof AdmissionTimeoutError)) {
          this.logger.error(`Task execution failed for socket ${socketId}:`, err?.message);
        }
        throw err; // Propagate error to caller
      });

    // Update the queue with the new task (this becomes the "last task" for next message)
    this.queues.set(socketId, newTask);

    // Cleanup: Remove from queue when this is the last task and it's done.
    // Observed on both outcomes, not through `.finally()`: that derived
    // promise rejects along with the task and, unobserved, would surface as
    // an unhandled rejection on every task failure.
    const settle = () => {
      if (this.queues.get(socketId) === newTask) {
        // This is still the last task, meaning no new tasks were added
        this.queues.delete(socketId);
        this.logger.debug(`Queue cleared for socket ${socketId}`);
      }
      // If queues.get(socketId) !== newTask, it means new tasks were added
      // We don't delete in this case to keep the chain
    };
    newTask.then(settle, settle);

    return newTask;
  }

  /**
   * Clear the queue for a specific socket
   * Called when socket disconnects to prevent memory leaks
   *
   * @param socketId - The socket ID to clear queue for
   */
  clearQueue(socketId: string): void {
    const hasQueue = this.queues.has(socketId);
    if (hasQueue) {
      this.queues.delete(socketId);
      this.logger.debug(`Forcefully cleared queue for disconnected socket ${socketId}`);
    }
  }

  // ============================================================================
  // Private Helper Methods - Timeout Management
  // ============================================================================

  /**
   * Wrap a promise with timeout protection
   * @param promise - The promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param socketId - The socket ID for logging
   * @returns Promise that resolves or rejects with timeout error
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    socketId: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Task timeout after ${timeoutMs}ms for socket ${socketId}`)),
          timeoutMs,
        ),
      ),
    ]);
  }
}
