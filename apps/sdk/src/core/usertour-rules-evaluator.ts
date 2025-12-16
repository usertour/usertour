import { finderV2 } from '@usertour-packages/finder';
import {
  RulesCondition,
  ElementConditionLogic,
  StringConditionLogic,
  RulesType,
  RulesTypeControl,
  SessionAttribute,
} from '@usertour/types';
import { document, off, on, autoBind } from '@/utils';
import { Evented } from '@/utils/evented';
import { evaluateRulesConditions, isEmptyString } from '@usertour/helpers';
import {
  getClientContext,
  convertToAttributeEvaluationOptions,
  isVisible,
} from '@/core/usertour-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Text input element types that support text fill detection
 */
type TextInputElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Click cache entry for tracking element click state
 */
interface ClickCacheEntry {
  element: HTMLElement;
  clicked: boolean;
  handler: () => void;
}

/**
 * Fill cache entry for tracking text fill state
 */
interface FillCacheEntry {
  element: TextInputElement;
  timestamp: number;
  value: string;
  isActive: boolean;
  handler: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Debounce time in milliseconds for text fill detection.
 * User must stop typing for this duration before fill is considered complete.
 */
const TEXT_FILL_DEBOUNCE_MS = 1000;

// ============================================================================
// RulesEvaluator Class
// ============================================================================

/**
 * RulesEvaluator handles condition evaluation for a specific content.
 * Each content should have its own evaluator instance to manage
 * element interaction state (click, text fill) independently.
 */
export class RulesEvaluator extends Evented {
  private readonly contentId: string;
  private clickCache = new Map<string, ClickCacheEntry>();
  private fillCache = new Map<string, FillCacheEntry>();

  constructor(contentId: string) {
    super();
    autoBind(this);
    this.contentId = contentId;
  }

  // === Public API ===

  /**
   * Gets the content ID for this evaluator
   */
  getContentId(): string {
    return this.contentId;
  }

  /**
   * Evaluates rules conditions
   * @param conditions - Rules conditions to evaluate
   * @param attributes - Optional session attributes for evaluation
   * @returns Evaluated conditions with results
   */
  async evaluate(
    conditions: RulesCondition[],
    attributes?: SessionAttribute[],
  ): Promise<RulesCondition[]> {
    const typeControl: RulesTypeControl = {
      [RulesType.CURRENT_PAGE]: true,
      [RulesType.TIME]: true,
      ...(attributes ? { [RulesType.USER_ATTR]: true } : {}),
    };
    const clientContext = getClientContext();

    return await evaluateRulesConditions(conditions, {
      clientContext,
      typeControl,
      customEvaluators: {
        [RulesType.ELEMENT]: this.isActiveRulesByElement,
        [RulesType.TEXT_INPUT]: this.isActiveRulesByTextInput,
        [RulesType.TEXT_FILL]: this.isActiveRulesByTextFill,
      },
      ...(attributes ? convertToAttributeEvaluationOptions(attributes) : {}),
    });
  }

  /**
   * Destroys the evaluator and cleans up all resources
   */
  destroy(): void {
    // Clear click cache and remove event listeners
    for (const { element, clicked, handler } of this.clickCache.values()) {
      if (!clicked) {
        // Only remove listener if not yet clicked (listener was already removed on click)
        off(element, 'click', handler);
      }
    }
    this.clickCache.clear();

    // Clear fill cache and remove event listeners
    for (const { element, isActive, handler } of this.fillCache.values()) {
      if (!isActive) {
        // Only remove listener if not yet active (listener was already removed on activation)
        off(element, 'input', handler);
      }
    }
    this.fillCache.clear();
  }

  // === Private: Element State Helpers ===

  /**
   * Check if an element has been clicked
   * @param ruleId - The rule ID used as cache key
   * @param el - The target element to track clicks on
   */
  private isClicked(ruleId: string, el: HTMLElement): boolean {
    const cached = this.clickCache.get(ruleId);

    if (cached) {
      // If already clicked, return true regardless of element reference
      if (cached.clicked) {
        return true;
      }
      // If element changed (re-rendered), update the listener
      if (cached.element !== el) {
        off(cached.element, 'click', cached.handler);
        const handler = this.createClickHandler(ruleId, el);
        on(el, 'click', handler);
        this.clickCache.set(ruleId, { element: el, clicked: false, handler });
      }
      return false;
    }

    // First call: create and cache the handler
    const handler = this.createClickHandler(ruleId, el);
    on(el, 'click', handler);
    this.clickCache.set(ruleId, { element: el, clicked: false, handler });
    return false;
  }

  /**
   * Creates a click handler for click cache
   */
  private createClickHandler(ruleId: string, el: HTMLElement): () => void {
    const handler = () => {
      const cacheData = this.clickCache.get(ruleId);
      if (cacheData) {
        cacheData.clicked = true;
        off(el, 'click', handler);
      }
    };
    return handler;
  }

  /**
   * Check if an element is disabled
   */
  private isDisabled(el: HTMLElement | null): boolean {
    if (!el) {
      return false;
    }

    // For form controls, use the disabled property which reflects the actual state
    if ('disabled' in el) {
      return Boolean(
        (
          el as
            | HTMLInputElement
            | HTMLButtonElement
            | HTMLSelectElement
            | HTMLTextAreaElement
            | HTMLOptionElement
            | HTMLFieldSetElement
        ).disabled,
      );
    }

    // For other elements, check if the disabled attribute exists
    return el.hasAttribute('disabled');
  }

  // === Private: Rule Evaluators ===

  /**
   * Check if element-based rules are active
   */
  private async isActiveRulesByElement(rules: RulesCondition): Promise<boolean> {
    const { data } = rules;
    if (!document || !data?.elementData) {
      return false;
    }
    const el = finderV2(data.elementData, document);
    const isPresent = el ? await isVisible(el) : false;

    switch (data.logic) {
      case ElementConditionLogic.PRESENT:
        return isPresent;
      case ElementConditionLogic.UNPRESENT:
        return !isPresent;
      case ElementConditionLogic.DISABLED:
        return el ? this.isDisabled(el) : false;
      case ElementConditionLogic.UNDISABLED:
        return el ? !this.isDisabled(el) : false;
      case ElementConditionLogic.CLICKED:
        return el ? this.isClicked(rules.id, el) : false;
      case ElementConditionLogic.UNCLICKED:
        return el ? !this.isClicked(rules.id, el) : false;
      default:
        return false;
    }
  }

  /**
   * Check if text input-based rules are active
   */
  private async isActiveRulesByTextInput(rules: RulesCondition): Promise<boolean> {
    const { data } = rules;
    if (!document || !data?.elementData) {
      return false;
    }
    const { elementData, logic, value } = data;
    const el = finderV2(elementData, document) as TextInputElement;
    if (!el) {
      return false;
    }
    const elValue = el.value ?? '';
    const compareValue = value ?? '';

    switch (logic) {
      case StringConditionLogic.IS:
        return elValue === compareValue;
      case StringConditionLogic.NOT:
        return elValue !== compareValue;
      case StringConditionLogic.CONTAINS:
        return elValue.includes(compareValue);
      case StringConditionLogic.NOT_CONTAIN:
        return !elValue.includes(compareValue);
      case StringConditionLogic.STARTS_WITH:
        return elValue.startsWith(compareValue);
      case StringConditionLogic.ENDS_WITH:
        return elValue.endsWith(compareValue);
      case StringConditionLogic.MATCH:
        return elValue.search(compareValue) !== -1;
      case StringConditionLogic.UNMATCH:
        return elValue.search(compareValue) === -1;
      case StringConditionLogic.ANY:
        return true;
      case StringConditionLogic.EMPTY:
        return isEmptyString(elValue);
      default:
        return false;
    }
  }

  /**
   * Check if text fill-based rules are active
   */
  private async isActiveRulesByTextFill(rules: RulesCondition): Promise<boolean> {
    const { data, id: ruleId } = rules;
    if (!document || !data?.elementData) {
      return false;
    }

    const el = finderV2(data.elementData, document) as TextInputElement;
    if (!el) {
      return false;
    }

    const cached = this.fillCache.get(ruleId);

    // First call: initialize cache
    if (!cached) {
      const handler = this.createFillInputHandler(ruleId);
      on(el, 'input', handler);
      this.fillCache.set(ruleId, {
        element: el,
        timestamp: -1,
        value: el.value,
        isActive: false,
        handler,
      });
      return false;
    }

    if (cached.isActive) {
      return true;
    }

    // Handle element re-rendering: reset state like debounce clearTimeout
    if (cached.element !== el) {
      off(cached.element, 'input', cached.handler);
      const handler = this.createFillInputHandler(ruleId);
      on(el, 'input', handler);
      this.fillCache.set(ruleId, {
        element: el,
        timestamp: -1,
        value: el.value,
        isActive: false,
        handler,
      });
      return false;
    }

    // Check if fill is complete
    const { timestamp, value, handler } = this.fillCache.get(ruleId)!;
    const hasValidInput =
      timestamp !== -1 &&
      Date.now() - timestamp > TEXT_FILL_DEBOUNCE_MS &&
      value !== el.value &&
      !isEmptyString(el.value);

    if (hasValidInput) {
      off(el, 'input', handler);
      this.fillCache.set(ruleId, { element: el, timestamp, value, isActive: true, handler });
      return true;
    }

    return false;
  }

  /**
   * Creates an input handler for fill cache
   */
  private createFillInputHandler(ruleId: string): () => void {
    return () => {
      const cacheData = this.fillCache.get(ruleId);
      if (cacheData) {
        cacheData.timestamp = Date.now();
      }
    };
  }
}

// ============================================================================
// RulesEvaluatorManager Class
// ============================================================================

/**
 * RulesEvaluatorManager manages RulesEvaluator instances for different contents.
 * It provides a centralized way to get, create, and destroy evaluators.
 */
export class RulesEvaluatorManager {
  private evaluators = new Map<string, RulesEvaluator>();

  /**
   * Gets or creates an evaluator for the specified content
   * @param contentId - The content ID
   * @returns The evaluator instance for this content
   */
  getEvaluator(contentId: string): RulesEvaluator {
    if (!this.evaluators.has(contentId)) {
      this.evaluators.set(contentId, new RulesEvaluator(contentId));
    }
    return this.evaluators.get(contentId)!;
  }

  /**
   * Checks if an evaluator exists for the specified content
   * @param contentId - The content ID
   * @returns True if an evaluator exists
   */
  hasEvaluator(contentId: string): boolean {
    return this.evaluators.has(contentId);
  }

  /**
   * Destroys the evaluator for the specified content
   * @param contentId - The content ID
   */
  destroyEvaluator(contentId: string): void {
    const evaluator = this.evaluators.get(contentId);
    if (evaluator) {
      evaluator.destroy();
      this.evaluators.delete(contentId);
    }
  }

  /**
   * Cleans up all evaluators
   */
  cleanup(): void {
    for (const evaluator of this.evaluators.values()) {
      evaluator.destroy();
    }
    this.evaluators.clear();
  }

  /**
   * Gets the number of active evaluators
   */
  getActiveCount(): number {
    return this.evaluators.size;
  }
}

// Export singleton instance
export const rulesEvaluatorManager = new RulesEvaluatorManager();
