import { StepTrigger, RulesCondition, SessionAttribute } from '@usertour/types';
import { uuidV4, isConditionsActived } from '@usertour/helpers';
import { rulesEvaluatorManager } from '@/core/usertour-rules-evaluator';
import { timerManager } from '@/utils/timer-manager';
import { autoBind } from '@/utils';
import { Evented } from '@/utils/evented';
import { logger } from '@/utils/logger';

/**
 * Manages trigger conditions and execution for a single step
 * Simple and focused - one trigger instance per step
 */
export class UsertourTrigger extends Evented {
  // === Static Members ===
  private static readonly MAX_WAIT_TIME = 300; // Maximum wait time in seconds

  // === Properties ===
  private triggers: StepTrigger[] = [];
  private readonly actionExecutor: (actions: RulesCondition[]) => Promise<void>;
  private readonly getSessionAttributes: () => SessionAttribute[];
  private readonly contentId: string; // Content ID for rules evaluation
  private readonly id: string; // Unique identifier for this trigger
  private activeTimeouts: Set<string> = new Set(); // Track active timeout keys
  private isProcessing = false; // Flag to prevent concurrent execution

  // === Constructor ===
  constructor(
    contentId: string,
    triggers: StepTrigger[],
    getSessionAttributes: () => SessionAttribute[],
    actionExecutor: (actions: RulesCondition[]) => Promise<void>,
  ) {
    super();
    autoBind(this);
    this.triggers = [...triggers]; // Copy to avoid modifying original
    this.contentId = contentId;
    this.actionExecutor = actionExecutor;
    this.id = uuidV4();
    this.getSessionAttributes = getSessionAttributes;
  }

  // === Public API ===
  /**
   * Processes all remaining triggers
   * Returns true if there are still pending triggers
   * Prevents concurrent execution to avoid duplicate trigger execution
   */
  async process(): Promise<boolean> {
    // Prevent concurrent execution
    if (this.isProcessing) {
      return this.triggers.length > 0;
    }

    if (this.triggers.length === 0) return false;

    this.isProcessing = true;
    try {
      const remainingTriggers: StepTrigger[] = [];
      const sessionAttributes = this.getSessionAttributes();
      const evaluator = rulesEvaluatorManager.getEvaluator(this.contentId);

      for (let i = 0; i < this.triggers.length; i++) {
        const trigger = this.triggers[i];
        const result = await this.evaluateTriggerConditions(trigger, evaluator, sessionAttributes);

        if (result === null) {
          // Evaluation failed, keep original trigger for next check
          remainingTriggers.push(trigger);
        } else if (!result.activated) {
          // Conditions not met, keep updated trigger for next check
          remainingTriggers.push(result.updatedTrigger);
        } else {
          // Conditions met, execute actions
          await this.executeTriggerActions(trigger, i);
        }
      }

      this.triggers = remainingTriggers;
      return this.triggers.length > 0;
    } finally {
      this.isProcessing = false;
    }
  }

  // === Private Methods ===
  /**
   * Evaluates conditions for a single trigger
   * @returns null if evaluation failed, otherwise returns activation result
   */
  private async evaluateTriggerConditions(
    trigger: StepTrigger,
    evaluator: ReturnType<typeof rulesEvaluatorManager.getEvaluator>,
    sessionAttributes: SessionAttribute[],
  ): Promise<{ activated: boolean; updatedTrigger: StepTrigger } | null> {
    const { conditions, ...rest } = trigger;

    try {
      const activatedConditions = await evaluator.evaluate(conditions, sessionAttributes);
      return {
        activated: isConditionsActived(activatedConditions),
        updatedTrigger: { ...rest, conditions: activatedConditions },
      };
    } catch (error) {
      logger.error(`Error evaluating trigger conditions for trigger ${trigger.id}:`, error);
      return null;
    }
  }

  /**
   * Executes actions for a triggered condition
   * Supports delayed execution via timer manager
   */
  private async executeTriggerActions(trigger: StepTrigger, index: number): Promise<void> {
    const waitTime = Math.min(trigger.wait ?? 0, UsertourTrigger.MAX_WAIT_TIME);

    if (waitTime > 0) {
      const triggerId = trigger.id || `trigger-${index}`;
      const timeoutKey = `${this.id}-${triggerId}`;

      this.activeTimeouts.add(timeoutKey);

      timerManager.setTimeout(
        timeoutKey,
        async () => {
          await this.actionExecutor(trigger.actions);
          this.activeTimeouts.delete(timeoutKey);
        },
        waitTime * 1000,
      );
    } else {
      await this.actionExecutor(trigger.actions);
    }
  }

  // === Status Queries ===
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

  // === Cleanup ===
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

    // Reset processing flag
    this.isProcessing = false;
  }
}
