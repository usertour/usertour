import { RulesCondition } from '@usertour/types';
import { activedRulesConditions, isActive } from '@/core/usertour-helper';
import { timerManager } from '@/utils/timer-manager';
import { logger } from '@/utils';
import { Evented } from '@/utils/evented';
import { autoBind } from '@/utils';
import { uuidV4 } from '@usertour/helpers';

/**
 * Options for rule monitoring
 */
interface RuleMonitorOptions {
  /** Whether to start monitoring automatically (default: true) */
  autoStart?: boolean;
  /** Monitoring interval in milliseconds (default: 1000) */
  interval?: number;
}

/**
 * Event data for rule state change
 */
interface RuleStateChangeEvent {
  rule: RulesCondition;
  timestamp: number;
  state: 'activated' | 'deactivated';
}

/**
 * UsertourRuleMonitor handles dynamic rules monitoring and reporting
 * Monitors an array of RulesCondition and reports when they become active
 */
export class UsertourRuleMonitor extends Evented {
  private rules: RulesCondition[] = [];
  private activeRules: Set<string> = new Set(); // Track currently active rules
  private readonly id: string;
  private readonly options: RuleMonitorOptions;
  private intervalId: string | null = null;

  constructor(options: RuleMonitorOptions = {}) {
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
   * Adds rules to monitor
   * @param rules - Array of rules to add
   */
  addRules(rules: RulesCondition[]): void {
    this.rules.push(...rules);
  }

  /**
   * Removes rules from monitoring by their IDs
   * @param ruleIds - Array of rule IDs to remove
   */
  removeRules(ruleIds: string[]): void {
    this.rules = this.rules.filter((rule) => !ruleIds.includes(rule.id));
  }

  /**
   * Removes rules from monitoring by rule objects (using their IDs)
   * @param rules - Array of rules to remove
   */
  removeRulesByObjects(rules: RulesCondition[]): void {
    const ruleIds = rules.map((rule) => rule.id);
    this.removeRules(ruleIds);
  }

  /**
   * Clears all rules
   */
  clearRules(): void {
    this.rules = [];
    this.activeRules.clear();
  }

  /**
   * Gets current rules
   */
  getRules(): RulesCondition[] {
    return [...this.rules];
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
        await this.checkRules();
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
   * Checks all rules and reports active ones
   */
  private async checkRules(): Promise<void> {
    if (this.rules.length === 0) return;

    try {
      // Process all rules to get their active state in one batch
      const activatedRules = await activedRulesConditions(this.rules);

      // Check which rules are active in one batch
      const activeRules = activatedRules.filter((rule) => isActive([rule]));

      // Check for state changes
      const currentActiveRuleIds = new Set<string>();

      for (const rule of activeRules) {
        currentActiveRuleIds.add(rule.id);

        // Check if rule just became active
        if (!this.activeRules.has(rule.id)) {
          await this.reportRuleStateChange(rule, 'activated');
          this.activeRules.add(rule.id);
        }
      }

      // Check for rules that became inactive
      for (const activeRuleId of this.activeRules) {
        if (!currentActiveRuleIds.has(activeRuleId)) {
          const rule = this.rules.find((r) => r.id === activeRuleId);
          if (rule) {
            await this.reportRuleStateChange(rule, 'deactivated');
          }
          this.activeRules.delete(activeRuleId);
        }
      }
    } catch (error) {
      logger.error('Error checking rules:', error);
    }
  }

  /**
   * Reports a rule state change
   * This method can be overridden or extended for custom reporting logic
   */
  protected async reportRuleStateChange(
    rule: RulesCondition,
    state: 'activated' | 'deactivated',
  ): Promise<void> {
    try {
      const eventData: RuleStateChangeEvent = {
        rule,
        timestamp: Date.now(),
        state,
      };

      // Emit event for external listeners
      this.trigger('rule-state-changed', eventData);

      // Log for debugging
      logger.info(`Rule ${state}:`, eventData);
    } catch (error) {
      logger.error(`Error reporting rule ${state}:`, error);
    }
  }

  /**
   * Destroys the monitor and cleans up resources
   */
  destroy(): void {
    this.stop();
    this.clearRules();
  }

  /**
   * Gets monitoring statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    isMonitoring: boolean;
  } {
    return {
      totalRules: this.rules.length,
      activeRules: this.activeRules.size,
      isMonitoring: true, // TODO: Add actual monitoring state tracking
    };
  }
}
