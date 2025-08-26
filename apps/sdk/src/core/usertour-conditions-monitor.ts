import { RulesCondition } from '@usertour/types';
import { activedRulesConditions } from '@/core/usertour-helper';
import { timerManager } from '@/utils/timer-manager';
import { logger } from '@/utils';
import { Evented } from '@/utils/evented';
import { autoBind } from '@/utils';
import { uuidV4, isConditionsActived } from '@usertour/helpers';

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
  condition: RulesCondition;
  timestamp: number;
  state: 'activated' | 'deactivated';
};

/**
 * UsertourConditionsMonitor handles dynamic conditions monitoring and reporting
 * Monitors an array of RulesCondition and reports when they become active or inactive
 */
export class UsertourConditionsMonitor extends Evented {
  private conditions: RulesCondition[] = [];
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
   * @param conditions - Array of conditions to add
   */
  addConditions(conditions: RulesCondition[]): void {
    this.conditions.push(...conditions);
  }

  /**
   * Removes conditions from monitoring by their IDs
   * @param conditionIds - Array of condition IDs to remove
   */
  removeConditions(conditionIds: string[]): void {
    this.conditions = this.conditions.filter((condition) => !conditionIds.includes(condition.id));
  }

  /**
   * Removes conditions from monitoring by condition objects (using their IDs)
   * @param conditions - Array of conditions to remove
   */
  removeConditionsByObjects(conditions: RulesCondition[]): void {
    const conditionIds = conditions.map((condition) => condition.id);
    this.removeConditions(conditionIds);
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
  getConditions(): RulesCondition[] {
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
   * Checks all conditions and reports active ones
   */
  private async checkConditions(): Promise<void> {
    if (this.conditions.length === 0) return;

    try {
      // Process all conditions to get their active state in one batch
      const activatedConditions = await activedRulesConditions(this.conditions);

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
          await this.reportConditionStateChange(condition, 'activated');
          this.activeConditions.add(condition.id);
        }
      }

      // Check for conditions that became inactive
      for (const activeConditionId of this.activeConditions) {
        if (!currentActiveConditionIds.has(activeConditionId)) {
          const condition = this.conditions.find((c) => c.id === activeConditionId);
          if (condition) {
            await this.reportConditionStateChange(condition, 'deactivated');
          }
          this.activeConditions.delete(activeConditionId);
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
    condition: RulesCondition,
    state: 'activated' | 'deactivated',
  ): Promise<void> {
    try {
      const eventData: ConditionStateChangeEvent = {
        condition,
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
   * Destroys the monitor and cleans up resources
   */
  destroy(): void {
    this.stop();
    this.clearConditions();
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
      isMonitoring: true, // TODO: Add actual monitoring state tracking
    };
  }
}
