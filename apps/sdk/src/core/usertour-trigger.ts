import { StepTrigger, RulesCondition } from '@usertour/types';
import { uuidV4, isConditionsActived } from '@usertour/helpers';
import { evaluateConditions } from '@/core/usertour-helper';
import { timerManager } from '@/utils/timer-manager';
import { autoBind } from '@/utils';
import { SessionAttribute } from '@/types/sdk';

/**
 * Manages trigger conditions and execution for a single step
 * Simple and focused - one trigger instance per step
 */
export class UsertourTrigger {
  private static readonly MAX_WAIT_TIME = 300; // Maximum wait time in seconds

  private triggers: StepTrigger[] = [];
  private readonly actionExecutor: (actions: RulesCondition[]) => Promise<void>;
  private readonly sessionAttributes: SessionAttribute[];
  private readonly id: string; // Unique identifier for this trigger
  private activeTimeouts: Set<string> = new Set(); // Track active timeout keys

  constructor(
    triggers: StepTrigger[],
    sessionAttributes: SessionAttribute[],
    actionExecutor: (actions: RulesCondition[]) => Promise<void>,
  ) {
    autoBind(this);
    this.triggers = [...triggers]; // Copy to avoid modifying original
    this.actionExecutor = actionExecutor;
    this.id = uuidV4();
    this.sessionAttributes = sessionAttributes;
  }

  /**
   * Processes all remaining triggers
   * Returns true if there are still pending triggers
   */
  async process(): Promise<boolean> {
    if (this.triggers.length === 0) return false;

    const remainingTriggers: StepTrigger[] = [];

    for (let i = 0; i < this.triggers.length; i++) {
      const trigger = this.triggers[i];
      const { conditions, ...rest } = trigger;
      const activatedConditions = await evaluateConditions(conditions, this.sessionAttributes);

      if (!isConditionsActived(activatedConditions)) {
        // Conditions not met, keep for next check
        remainingTriggers.push({
          ...rest,
          conditions: activatedConditions,
        });
      } else {
        // Conditions met, execute actions
        const waitTime = Math.min(trigger.wait ?? 0, UsertourTrigger.MAX_WAIT_TIME);

        if (waitTime > 0) {
          // Execute with delay using timer manager
          const triggerId = trigger.id || `trigger-${i}`;
          const timeoutKey = `${this.id}-${triggerId}`;

          // Track the timeout key for cleanup
          this.activeTimeouts.add(timeoutKey);

          timerManager.setTimeout(
            timeoutKey,
            async () => {
              await this.actionExecutor(trigger.actions);
              // Remove from tracking after execution
              this.activeTimeouts.delete(timeoutKey);
            },
            waitTime * 1000,
          );
        } else {
          // Execute immediately
          await this.actionExecutor(trigger.actions);
        }
      }
    }

    // Update remaining triggers
    this.triggers = remainingTriggers;

    // Return true if there are still pending triggers
    return this.triggers.length > 0;
  }

  /**
   * Gets the count of remaining triggers
   */
  getRemainingCount(): number {
    return this.triggers.length;
  }

  /**
   * Checks if there are any remaining triggers
   */
  hasRemaining(): boolean {
    return this.triggers.length > 0;
  }

  /**
   * Gets the remaining triggers (for debugging)
   */
  getRemaining(): StepTrigger[] {
    return [...this.triggers];
  }

  /**
   * Clears all triggers and timeouts
   */
  destroy(): void {
    // Clear all active timeouts
    for (const timeoutKey of this.activeTimeouts) {
      timerManager.clearTimeout(timeoutKey);
    }
    this.activeTimeouts.clear();

    // Clear triggers
    this.triggers = [];
  }
}
