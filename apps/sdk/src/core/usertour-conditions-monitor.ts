import { evaluateConditions } from '@/core/usertour-helper';
import { timerManager } from '@/utils/timer-manager';
import { logger } from '@/utils';
import { Evented } from '@/utils/evented';
import { autoBind } from '@/utils';
import { uuidV4, isConditionsActived } from '@usertour/helpers';
import { TrackCondition } from '@/types';

/**
 * Options for condition monitoring
 */
interface ConditionsMonitorOptions {
  /** Whether to start monitoring automatically (default: true) */
  autoStart?: boolean;
  /** Monitoring interval in milliseconds (default: 1000) */
  interval?: number;
}

/**
 * Event data for condition state change
 */
export type ConditionStateChangeEvent = {
  trackCondition: TrackCondition;
  timestamp: number;
  state: 'activated' | 'deactivated';
};

/**
 * UsertourConditionsMonitor handles dynamic conditions monitoring and reporting
 * Monitors an array of TrackCondition and reports when they become active or inactive
 */
export class UsertourConditionsMonitor extends Evented {
  private conditions: TrackCondition[] = [];
  private activeConditions: Set<string> = new Set(); // Track currently active conditions
  private readonly id: string;
  private readonly options: ConditionsMonitorOptions;
  private intervalId: string | null = null;

  constructor(options: ConditionsMonitorOptions = {}) {
    super();
    autoBind(this);

    this.id = uuidV4();
    this.options = {
      autoStart: true,
      interval: 1000,
      ...options,
    };

    // Start monitoring automatically if enabled
    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Adds conditions to monitor
   * @param conditions - Array of TrackCondition objects to add
   */
  addConditions(conditions: TrackCondition[]): void {
    for (const trackCondition of conditions) {
      // Remove existing condition with same ID if it exists
      const existingIndex = this.conditions.findIndex(
        (c) => c.condition.id === trackCondition.condition.id,
      );
      if (existingIndex !== -1) {
        this.conditions.splice(existingIndex, 1);
        // Also remove from active conditions to prevent memory leaks
        this.activeConditions.delete(trackCondition.condition.id);
      }

      // Add new condition
      this.conditions.push(trackCondition);
    }

    // Immediately check the initial state of newly added conditions
    if (conditions.length > 0) {
      this.checkInitialConditionStates(conditions);
    }
  }

  /**
   * Removes conditions from monitoring by their IDs
   * @param conditionIds - Array of condition IDs to remove
   */
  removeConditions(conditionIds: string[]): void {
    this.conditions = this.conditions.filter(
      (trackCondition) => !conditionIds.includes(trackCondition.condition.id),
    );
    // Also remove from active conditions to prevent memory leaks
    for (const id of conditionIds) {
      this.activeConditions.delete(id);
    }
  }

  /**
   * Clears all conditions
   */
  clearConditions(): void {
    this.conditions = [];
    this.activeConditions.clear();
  }

  /**
   * Gets current conditions
   */
  getConditions(): TrackCondition[] {
    return [...this.conditions];
  }

  /**
   * Starts monitoring
   */
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = `${this.id}-monitor`;
    timerManager.setInterval(
      this.intervalId,
      async () => {
        await this.checkConditions();
      },
      this.options.interval || 1000,
    );
  }

  /**
   * Stops monitoring
   */
  stop(): void {
    if (this.intervalId) {
      timerManager.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Checks the initial state of newly added conditions
   * @param conditions - Array of TrackCondition objects to check
   */
  private async checkInitialConditionStates(conditions: TrackCondition[]): Promise<void> {
    try {
      // Extract RulesCondition from TrackCondition for evaluation
      const rulesConditions = conditions.map((trackCondition) => trackCondition.condition);
      const activatedConditions = await evaluateConditions(rulesConditions);

      for (const condition of activatedConditions) {
        const isActive = isConditionsActived([condition]);

        if (isActive) {
          // Condition is currently active
          if (!this.activeConditions.has(condition.id)) {
            this.activeConditions.add(condition.id);
            // Find the corresponding TrackCondition to get contentType
            const trackCondition = conditions.find((tc) => tc.condition.id === condition.id);
            if (trackCondition) {
              await this.reportConditionStateChange(trackCondition, 'activated');
            }
          }
        } else {
          // Condition is currently inactive - report deactivated for initial state
          if (!this.activeConditions.has(condition.id)) {
            const trackCondition = conditions.find((tc) => tc.condition.id === condition.id);
            if (trackCondition) {
              await this.reportConditionStateChange(trackCondition, 'deactivated');
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error checking initial condition states:', error);
    }
  }

  /**
   * Checks all conditions and reports active ones
   */
  private async checkConditions(): Promise<void> {
    if (this.conditions.length === 0) return;

    try {
      // Extract RulesCondition from TrackCondition for evaluation
      const rulesConditions = this.conditions.map((trackCondition) => trackCondition.condition);
      const activatedConditions = await evaluateConditions(rulesConditions);

      // Check which conditions are active in one batch
      const activeConditions = activatedConditions.filter((condition) =>
        isConditionsActived([condition]),
      );

      // Check for state changes
      const currentActiveConditionIds = new Set<string>();

      for (const condition of activeConditions) {
        currentActiveConditionIds.add(condition.id);

        // Check if condition just became active
        if (!this.activeConditions.has(condition.id)) {
          // Update state first, then trigger event
          this.activeConditions.add(condition.id);
          // Find the corresponding TrackCondition to get contentType
          const trackCondition = this.conditions.find((tc) => tc.condition.id === condition.id);
          if (trackCondition) {
            await this.reportConditionStateChange(trackCondition, 'activated');
          }
        }
      }

      // Check for conditions that became inactive
      for (const activeConditionId of this.activeConditions) {
        if (!currentActiveConditionIds.has(activeConditionId)) {
          const trackCondition = this.conditions.find(
            (tc) => tc.condition.id === activeConditionId,
          );
          if (trackCondition) {
            // Update state first, then trigger event
            this.activeConditions.delete(activeConditionId);
            await this.reportConditionStateChange(trackCondition, 'deactivated');
          }
        }
      }
    } catch (error) {
      logger.error('Error checking conditions:', error);
    }
  }

  /**
   * Reports a condition state change
   * This method can be overridden or extended for custom reporting logic
   */
  protected async reportConditionStateChange(
    trackCondition: TrackCondition,
    state: 'activated' | 'deactivated',
  ): Promise<void> {
    try {
      const eventData: ConditionStateChangeEvent = {
        trackCondition,
        timestamp: Date.now(),
        state,
      };

      // Emit event for external listeners
      this.trigger('condition-state-changed', eventData);

      // Log for debugging
      logger.info(`Condition ${state}:`, eventData);
    } catch (error) {
      logger.error(`Error reporting condition ${state}:`, error);
    }
  }

  /**
   * Cleans up the monitor and cleans up resources
   */
  cleanup(): void {
    this.stop();
    this.clearConditions();
  }

  /**
   * Gets set of active condition IDs
   */
  getActiveConditionIds(): Set<string> {
    return new Set(this.activeConditions);
  }

  /**
   * Gets monitoring statistics
   */
  getStats(): {
    totalConditions: number;
    activeConditions: number;
    isMonitoring: boolean;
  } {
    return {
      totalConditions: this.conditions.length,
      activeConditions: this.activeConditions.size,
      isMonitoring: this.intervalId !== null,
    };
  }
}
