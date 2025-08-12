import { StepTrigger, RulesCondition } from '@usertour/types';
import { isActive } from '@usertour/helpers';
import { activedRulesConditions } from '@/core/usertour-helper';
import { autoBind } from '@/utils';

/**
 * Manages trigger conditions and execution for a single step
 * Simple and focused - one trigger instance per step
 */
export class UsertourTrigger {
  private static readonly MAX_WAIT_TIME = 300; // Maximum wait time in seconds

  private triggers: StepTrigger[] = [];
  private timeouts: NodeJS.Timeout[] = [];
  private readonly actionExecutor: (actions: RulesCondition[]) => Promise<void>;

  constructor(
    triggers: StepTrigger[],
    actionExecutor: (actions: RulesCondition[]) => Promise<void>,
  ) {
    autoBind(this);
    this.triggers = [...triggers]; // Copy to avoid modifying original
    this.actionExecutor = actionExecutor;
  }

  /**
   * Processes all remaining triggers
   * Returns true if there are still pending triggers
   */
  async process(): Promise<boolean> {
    if (this.triggers.length === 0) return false;

    const remainingTriggers: StepTrigger[] = [];

    for (const trigger of this.triggers) {
      const { conditions, ...rest } = trigger;
      const activatedConditions = await activedRulesConditions(conditions);

      if (!isActive(activatedConditions)) {
        // Conditions not met, keep for next check
        remainingTriggers.push({
          ...rest,
          conditions: activatedConditions,
        });
      } else {
        // Conditions met, execute actions
        const waitTime = Math.min(trigger.wait ?? 0, UsertourTrigger.MAX_WAIT_TIME);

        if (waitTime > 0) {
          // Execute with delay
          const timeoutId = setTimeout(async () => {
            await this.actionExecutor(trigger.actions);
            // Remove timeout from tracking
            this.timeouts = this.timeouts.filter((id) => id !== timeoutId);
          }, waitTime * 1000);

          this.timeouts.push(timeoutId);
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
    // Clear all timeouts
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];

    // Clear triggers
    this.triggers = [];
  }
}
