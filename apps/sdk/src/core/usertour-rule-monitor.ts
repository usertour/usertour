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
 * Event data for rule activation
 */
interface RuleActivationEvent {
  rule: RulesCondition;
  timestamp: number;
}

/**
 * UsertourRuleMonitor handles dynamic rules monitoring and reporting
 * Monitors an array of RulesCondition and reports when they become active
 */
export class UsertourRuleMonitor extends Evented {
  private rules: RulesCondition[] = [];
  private reportedRules: Set<string> = new Set();
  private readonly id: string;
  private readonly options: RuleMonitorOptions;

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
    this.reportedRules.clear();
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
    timerManager.addTask(
      `${this.id}-monitor`,
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
    timerManager.removeTask(`${this.id}-monitor`);
  }

  /**
   * Checks all rules and reports active ones
   */
  private async checkRules(): Promise<void> {
    if (this.rules.length === 0) return;

    try {
      // Process all rules to get their active state
      const activatedRules = await activedRulesConditions(this.rules);

      // Check which rules are active
      for (let i = 0; i < activatedRules.length; i++) {
        const rule = activatedRules[i];

        // Check if rule is active
        if (isActive([rule])) {
          // Report if not already reported
          if (!this.reportedRules.has(rule.id)) {
            await this.reportActiveRule(rule);
            this.reportedRules.add(rule.id);
          }
        } else {
          // Remove from reported set if no longer active
          this.reportedRules.delete(rule.id);
        }
      }
    } catch (error) {
      logger.error('Error checking rules:', error);
    }
  }

  /**
   * Reports an active rule
   * This method can be overridden or extended for custom reporting logic
   */
  protected async reportActiveRule(rule: RulesCondition): Promise<void> {
    try {
      const eventData: RuleActivationEvent = {
        rule,
        timestamp: Date.now(),
      };

      // Emit event for external listeners
      this.trigger('rule-activated', eventData);

      // Log for debugging
      logger.info('Rule activated:', eventData);

      // Mock implementation - can be overridden
      console.log('Reporting active rule:', eventData);
    } catch (error) {
      logger.error('Error reporting active rule:', error);
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
    reportedRules: number;
    isMonitoring: boolean;
  } {
    return {
      totalRules: this.rules.length,
      reportedRules: this.reportedRules.size,
      isMonitoring: true, // TODO: Add actual monitoring state tracking
    };
  }
}
