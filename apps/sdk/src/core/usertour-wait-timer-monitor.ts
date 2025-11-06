import { timerManager } from '@/utils/timer-manager';
import { logger } from '@/utils';
import { Evented } from '@/utils/evented';
import { autoBind } from '@/utils';
import { uuidV4 } from '@usertour/helpers';
import { ConditionWaitTimer } from '@/types/sdk';
import { SDKClientEvents } from '@usertour-packages/constants';

// === Interfaces ===
/**
 * Options for wait timer monitoring
 */
interface WaitTimerMonitorOptions {
  /** Whether to start monitoring automatically (default: true) */
  autoStart?: boolean;
}

/**
 * Event data for wait timer state change
 */
export type WaitTimerStateChangeEvent = {
  condition: ConditionWaitTimer;
  timestamp: number;
  state: 'started' | 'fired' | 'cancelled';
};

/**
 * Internal wait timer item with additional tracking information
 */
interface WaitTimerItem extends ConditionWaitTimer {
  timerId: string;
  startTime: number;
  isActive: boolean;
}

/**
 * ConditionWaitTimersMonitor handles wait timer conditions queue management
 * Monitors ConditionWaitTimer objects and manages their timeout execution
 */
export class ConditionWaitTimersMonitor extends Evented {
  // === Properties ===
  private waitTimers: Map<string, WaitTimerItem> = new Map();
  private readonly id: string;
  private readonly options: WaitTimerMonitorOptions;

  // === Constructor ===
  constructor(options: WaitTimerMonitorOptions = {}) {
    super();
    autoBind(this);

    this.id = uuidV4();
    this.options = {
      autoStart: true,
      ...options,
    };
  }

  // === Public API ===
  /**
   * Adds a wait timer condition to the queue
   * @param condition - ConditionWaitTimer to add
   */
  addWaitTimer(condition: ConditionWaitTimer): void {
    const timerId = `${this.id}-${condition.versionId}`;

    // Cancel existing timer for the same versionId if it exists
    this.cancelWaitTimer(condition.versionId);

    const waitTimerItem: WaitTimerItem = {
      ...condition,
      timerId,
      startTime: Date.now(),
      isActive: true,
    };

    this.waitTimers.set(condition.versionId, waitTimerItem);

    // Set timeout using timerManager
    timerManager.setTimeout(
      timerId,
      () => {
        this.handleTimerFired(condition.versionId);
      },
      condition.waitTime * 1000, // Convert seconds to milliseconds
    );

    // Report timer started
    this.reportWaitTimerStateChange(condition, 'started');

    logger.info(
      `Wait timer started for versionId: ${condition.versionId}, waitTime: ${condition.waitTime}s`,
    );
  }

  /**
   * Cancels a wait timer condition from the queue
   * @param versionId - Version ID of the condition to cancel
   */
  cancelWaitTimer(versionId: string): void {
    const waitTimerItem = this.waitTimers.get(versionId);

    if (!waitTimerItem) {
      return; // Timer not found, nothing to cancel
    }

    // Clear the timeout
    timerManager.clearTimeout(waitTimerItem.timerId);

    // Mark as inactive
    waitTimerItem.isActive = false;

    // Remove from map
    this.waitTimers.delete(versionId);

    // Report timer cancelled
    this.reportWaitTimerStateChange(waitTimerItem, 'cancelled');

    logger.info(`Wait timer cancelled for versionId: ${versionId}`);
  }

  // === Status Queries ===
  /**
   * Gets all active wait timers
   */
  getActiveWaitTimers(): ConditionWaitTimer[] {
    const activeTimers: ConditionWaitTimer[] = [];

    for (const waitTimerItem of this.waitTimers.values()) {
      if (waitTimerItem.isActive) {
        activeTimers.push({
          ...waitTimerItem,
        });
      }
    }

    return activeTimers;
  }

  /**
   * Gets a specific wait timer by versionId
   */
  getWaitTimer(versionId: string): ConditionWaitTimer | null {
    const waitTimerItem = this.waitTimers.get(versionId);

    if (!waitTimerItem || !waitTimerItem.isActive) {
      return null;
    }

    return waitTimerItem;
  }

  /**
   * Checks if a wait timer is active for a given versionId
   */
  isWaitTimerActive(versionId: string): boolean {
    const waitTimerItem = this.waitTimers.get(versionId);
    return waitTimerItem?.isActive ?? false;
  }

  /**
   * Gets monitoring statistics
   */
  getStats(): {
    totalWaitTimers: number;
    activeWaitTimers: number;
  } {
    let activeCount = 0;
    for (const waitTimerItem of this.waitTimers.values()) {
      if (waitTimerItem.isActive) {
        activeCount++;
      }
    }

    return {
      totalWaitTimers: this.waitTimers.size,
      activeWaitTimers: activeCount,
    };
  }

  // === Timer Management ===
  /**
   * Handles timer firing
   * @param versionId - Version ID of the fired timer
   */
  private handleTimerFired(versionId: string): void {
    const waitTimerItem = this.waitTimers.get(versionId);

    if (!waitTimerItem || !waitTimerItem.isActive) {
      return; // Timer not found or already cancelled
    }

    // Mark as inactive
    waitTimerItem.isActive = false;

    // Remove from map
    this.waitTimers.delete(versionId);

    // Report timer fired
    this.reportWaitTimerStateChange(waitTimerItem, 'fired');

    logger.info(`Wait timer fired for versionId: ${versionId}`);
  }

  /**
   * Clears all wait timers
   */
  clearAllWaitTimers(): void {
    for (const [, waitTimerItem] of this.waitTimers) {
      // Clear the timeout
      timerManager.clearTimeout(waitTimerItem.timerId);

      // Report as cancelled
      this.reportWaitTimerStateChange(waitTimerItem, 'cancelled');
    }

    this.waitTimers.clear();
    logger.info('All wait timers cleared');
  }

  // === Event Reporting ===
  /**
   * Reports a wait timer state change
   * This method can be overridden or extended for custom reporting logic
   */
  protected async reportWaitTimerStateChange(
    condition: ConditionWaitTimer,
    state: 'started' | 'fired' | 'cancelled',
  ): Promise<void> {
    try {
      const eventData: WaitTimerStateChangeEvent = {
        condition,
        timestamp: Date.now(),
        state,
      };

      // Emit event for external listeners
      this.trigger(SDKClientEvents.WAIT_TIMER_STATE_CHANGED, eventData);

      // Log for debugging
      logger.info(`Wait timer ${state}:`, eventData);
    } catch (error) {
      logger.error(`Error reporting wait timer ${state}:`, error);
    }
  }

  // === Cleanup ===
  /**
   * Cleans up the monitor and cleans up resources
   */
  cleanup(): void {
    this.clearAllWaitTimers();
  }
}
