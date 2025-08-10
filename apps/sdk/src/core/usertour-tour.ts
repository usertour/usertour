import { smoothScroll } from '@usertour-packages/dom';
import {
  ContentEditorClickableElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  isQuestionElement,
} from '@usertour-packages/shared-editor';
import {
  ContentActionsItemType,
  RulesCondition,
  Step,
  StepContentType,
  StepTrigger,
  contentEndReason,
} from '@usertour/types';
import {
  convertSettings,
  convertToCssVars,
  evalCode,
  isActive,
  isUndefined,
} from '@usertour/helpers';
import { TourStore } from '@/types/store';
import { ElementWatcher } from '@/core/element-watcher';
import { ExternalStore } from '@/core/store';
import { Evented } from '@/core/evented';
import { autoBind, AppEvents, getStepByCvid, document, activedRulesConditions } from '@/utils';
import { getAssets } from '@/core/common';
import { SDKContentSession } from '@/types/sdk';
import { UsertourCore } from './usertour-core';
import { AnswerQuestionDto } from '@/types/web-socket';

export class UsertourTour extends Evented {
  private watcher: ElementWatcher | null = null;
  private triggerTimeouts: NodeJS.Timeout[] = []; // Store timeout IDs
  private currentStep?: Step | null;
  private steps?: Step[];
  private store: ExternalStore<TourStore>;
  private session: SDKContentSession;
  private readonly instance: UsertourCore;

  constructor(instance: UsertourCore, session: SDKContentSession) {
    super();
    autoBind(this);
    this.store = new ExternalStore<TourStore>(undefined);
    this.session = session;
    this.instance = instance;
    this.steps = session.version.steps;
  }

  /**
   * Get the session id
   */
  getSessionId(): string {
    return this.session.id;
  }

  /**
   * Shows a specific step in the tour by its cvid, or the first step if no cvid is provided
   * @param cvid - Optional cvid of the step to show. If not provided, shows the first step
   * @returns Promise that resolves when the step is shown, or rejects if the tour cannot be shown
   */
  async show(cvid?: string): Promise<void> {
    // Validate content is valid
    if (!this.steps || !this.steps.length) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    const steps = this.steps;
    // Find the target step
    const currentStep = cvid ? getStepByCvid(steps, cvid) : steps[0];

    // If no valid step found, close the tour
    if (!currentStep?.cvid) {
      await this.close(contentEndReason.STEP_NOT_FOUND);
      return;
    }

    // Reset tour state and set new step
    this.reset();
    this.currentStep = currentStep;
    // Display step based on its type
    await this.displayStep(currentStep);
  }

  /**
   * Builds the store data for the tour
   * This method combines the base store info with the current step data
   * and sets default values for required fields
   *
   * @returns {TourStore} The complete store data object
   */
  private buildStoreData(): TourStore {
    // Get base store information
    const currentStep = this.currentStep;
    const themeSettings = this.session.version.theme?.settings;
    if (!themeSettings) {
      throw new Error('Theme settings not found');
    }
    const zIndex = this.instance.getBaseZIndex() ?? 0;
    const sdkConfig = this.instance.getSdkConfig();

    // Combine all store data with proper defaults
    return {
      triggerRef: null, // Reset trigger reference
      sdkConfig: sdkConfig,
      assets: getAssets(themeSettings),
      globalStyle: convertToCssVars(convertSettings(themeSettings)),
      themeSettings: themeSettings,
      userAttributes: {},
      openState: false,
      currentStep, // Add current step
      zIndex: zIndex + 200,
    } as TourStore;
  }

  /**
   * Displays a step based on its type
   * @private
   */
  private async displayStep(step: Step): Promise<void> {
    if (step.type === StepContentType.TOOLTIP) {
      await this.showPopper(step);
    } else if (step.type === StepContentType.MODAL) {
      await this.showModal(step);
    } else if (step.type === StepContentType.HIDDEN) {
      await this.showHidden(step);
    } else {
      this.close(contentEndReason.SYSTEM_CLOSED);
    }
  }

  /**
   * Displays a tooltip step in the tour
   * This method handles:
   * 1. Validating the step and its target
   * 2. Setting up the element watcher
   * 3. Handling element found and timeout events
   * 4. Updating the store with the new state
   *
   * @param currentStep - The step to display as a tooltip
   * @throws Will close the tour if validation fails or target is missing
   */
  async showPopper(currentStep: Step): Promise<void> {
    // Validate step and target
    if (!this.isValidPopperStep(currentStep)) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Report step seen event
    await this.reportStepEvents(currentStep);

    // Activate trigger conditions
    await this.activeTriggerConditions();

    // Set up element watcher
    const store = this.buildStoreData();
    this.setupElementWatcher(currentStep, store);
  }

  /**
   * Validates if a step can be displayed as a popper
   * @private
   */
  private isValidPopperStep(step: Step): boolean {
    return Boolean(step?.target && step.cvid === this.currentStep?.cvid && document);
  }

  /**
   * Sets up the element watcher for a popper step
   * @private
   */
  private setupElementWatcher(step: Step, store: TourStore): void {
    // Clean up existing watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }

    // Create new watcher
    if (!step.target) {
      this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
      return;
    }
    this.watcher = new ElementWatcher(step.target);
    const targetMissingSeconds = this.instance.getTargetMissingSeconds();
    if (!isUndefined(targetMissingSeconds)) {
      this.watcher.setTargetMissingSeconds(targetMissingSeconds);
    }

    // Handle element found
    this.watcher.once(AppEvents.ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, step, store);
      }
    });

    // Handle element not found
    this.watcher.once(AppEvents.ELEMENT_FOUND_TIMEOUT, async () => {
      await this.handleElementNotFound(step);
    });

    // Handle element changed
    this.watcher.on(AppEvents.ELEMENT_CHANGED, (el) => {
      if (el instanceof Element) {
        this.handleElementChanged(el, step, store);
      }
    });
    // Start watching
    this.watcher.findElement();
  }

  /**
   * Handles when the target element is found
   * @private
   */
  private handleElementFound(el: Element, step: Step, store: TourStore): void {
    const currentStep = this.currentStep;
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    const { progress, index, total } = this.getCurrentStepInfo(step);

    // Scroll element into view if tour is visible
    smoothScroll(el, { block: 'center' });

    // Update store
    this.store.setData({
      ...store,
      progress,
      currentStepIndex: index,
      totalSteps: total,
      triggerRef: el,
      openState: true,
    });
  }

  private handleElementChanged(el: Element, step: Step, store: TourStore): void {
    const currentStep = this.currentStep;
    if (currentStep?.cvid !== step.cvid) {
      return;
    }

    // Update store
    this.store.setData({
      ...store,
      triggerRef: el,
    });
  }

  /**
   * Handles when the target element is not found
   * @private
   */
  private async handleElementNotFound(step: Step): Promise<void> {
    const currentStep = this.currentStep;
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    await this.reportTooltipTargetMissingEvent(step);
    await this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
  }

  /**
   * Display a modal step in the tour
   * This method handles:
   * 1. Building the store data
   * 2. Reporting step seen event
   * 3. Setting up the modal state
   * 4. Reporting completion event if it's the last step
   *
   * @param currentStep - The step to be displayed as a modal
   */
  async showModal(currentStep: Step) {
    // Build store data and get step information
    const store = this.buildStoreData();
    const { progress, index, total } = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepEvents(currentStep);

    // Activate trigger conditions
    await this.activeTriggerConditions();

    // Set up modal state
    this.store.setData({
      ...store,
      openState: true,
      progress,
      currentStepIndex: index, // Convert to 0-based index
      totalSteps: total,
    });
  }

  /**
   * Displays a hidden step in the tour
   * This method handles:
   * 1. Reporting the step seen event
   * 2. Reporting the completion event if it's the last step
   *
   */
  async showHidden(currentStep: Step) {
    await this.reportStepEvents(currentStep);
  }

  /**
   * Close the current tour
   * @param reason - The reason for closing the tour, defaults to USER_CLOSED
   */
  async close(reason: contentEndReason = contentEndReason.USER_CLOSED) {
    // Report close event
    await this.reportCloseEvent(reason);
    // Destroy the tour
    this.destroy();
  }

  /**
   * Handles the close event
   * @param reason - The reason for closing the tour, defaults to USER_CLOSED
   */
  async handleClose(reason?: contentEndReason) {
    await this.close(reason);
  }

  /**
   * Handles the actions for the current step
   * This method executes all actions in sequence
   *
   * @param actions - The actions to be handled
   */
  async handleActions(actions: RulesCondition[]) {
    // Split actions into two groups
    const pageNavigateActions = actions.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actions.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );

    // Execute non-PAGE_NAVIGATE actions first
    for (const action of otherActions) {
      if (action.type === ContentActionsItemType.STEP_GOTO) {
        await this.show(action.data.stepCvid);
      } else if (action.type === ContentActionsItemType.FLOW_START) {
        await this.instance.startTour(action.data.contentId, action.data.stepCvid);
      } else if (action.type === ContentActionsItemType.FLOW_DISMIS) {
        await this.handleClose(contentEndReason.USER_CLOSED);
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      }
    }

    // Execute PAGE_NAVIGATE actions last
    for (const action of pageNavigateActions) {
      this.instance.handleNavigate(action.data);
    }
  }

  /**
   * Handles the click event on an element
   * This method handles:
   * 1. Updating the user's attributes if the element is a question element
   * 2. Reporting the question answer event
   * 3. Handling any actions associated with the element
   *
   * @param element - The element that was clicked
   * @param value - The value of the element
   */
  async handleOnClick(element: ContentEditorClickableElement, value?: any) {
    if (isQuestionElement(element)) {
      const el = element as ContentEditorQuestionElement;
      if (el?.data?.bindToAttribute && el?.data?.selectedAttribute) {
        await this.instance.updateUser({
          [el.data.selectedAttribute]: value,
        });
      }
      await this.reportQuestionAnswer(el, value);
    }
    if (element?.data?.actions) {
      await this.handleActions(element.data.actions);
    }
  }

  /**
   * Reports the question answer event
   * This method handles:
   * 1. Reporting the question answer event with the correct event name
   * 2. Adding the question cvid, name, and type to the event data
   * 3. Handling multiple choice, scale, NPS, and star rating elements
   *
   * @param element - The question element that was answered
   * @param value - The value of the answer
   */
  async reportQuestionAnswer(element: ContentEditorQuestionElement, value?: any) {
    const { data, type } = element;
    const { cvid } = data;
    const eventData: AnswerQuestionDto = {
      questionCvid: cvid,
      questionName: data.name,
      questionType: type,
      sessionId: this.session.id,
    };
    if (element.type === ContentEditorElementType.MULTIPLE_CHOICE) {
      if (element.data.allowMultiple) {
        eventData.listAnswer = value as string[];
      } else {
        eventData.textAnswer = value;
      }
    } else if (
      element.type === ContentEditorElementType.SCALE ||
      element.type === ContentEditorElementType.NPS ||
      element.type === ContentEditorElementType.STAR_RATING
    ) {
      eventData.numberAnswer = value;
    } else if (
      element.type === ContentEditorElementType.SINGLE_LINE_TEXT ||
      element.type === ContentEditorElementType.MULTI_LINE_TEXT
    ) {
      eventData.textAnswer = value;
    }
    await this.instance.socket?.answerQuestion(eventData, { batch: true });
  }

  /**
   * Activates and processes trigger conditions for the current step
   * This method:
   * 1. Processes each trigger's conditions
   * 2. Executes actions for triggers with met conditions
   * 3. Updates the step with remaining triggers
   *
   * @returns {Promise<void>}
   */
  async activeTriggerConditions(): Promise<void> {
    const currentStep = this.currentStep;

    // Early return if no triggers to process
    if (!currentStep?.trigger?.length) {
      return;
    }

    // Process triggers and collect remaining ones
    const remainingTriggers = await this.processTriggers(currentStep.trigger);

    // Update step with remaining triggers if step hasn't changed
    await this.updateStepWithRemainingTriggers(currentStep, remainingTriggers);
  }

  /**
   * Processes a list of triggers and executes actions for those with met conditions
   * @private
   */
  private async processTriggers(triggers: StepTrigger[]): Promise<StepTrigger[]> {
    const remainingTriggers: StepTrigger[] = [];
    const MAX_WAIT_TIME = 300; // Maximum wait time in seconds
    for (const trigger of triggers) {
      const { conditions, ...rest } = trigger;
      const activatedConditions = await activedRulesConditions(conditions);

      if (!isActive(activatedConditions)) {
        remainingTriggers.push({
          ...rest,
          conditions: activatedConditions,
        });
      } else {
        const waitTime = Math.min(trigger.wait ?? 0, MAX_WAIT_TIME);
        if (waitTime > 0) {
          const timeoutId = setTimeout(() => {
            // Execute actions immediately when conditions are met
            this.handleActions(trigger.actions);
            // Remove the timeout ID from the array after execution
            this.triggerTimeouts = this.triggerTimeouts.filter((id) => id !== timeoutId);
          }, waitTime * 1000);
          // Store the timeout ID
          this.triggerTimeouts.push(timeoutId);
        } else {
          // Execute actions immediately when conditions are met
          await this.handleActions(trigger.actions);
        }
      }
    }

    return remainingTriggers;
  }

  /**
   * Updates the current step with remaining triggers if the step hasn't changed
   * @private
   */
  private async updateStepWithRemainingTriggers(
    originalStep: Step,
    remainingTriggers: StepTrigger[],
  ): Promise<void> {
    const newCurrentStep = this.currentStep;

    // Only update if the step hasn't changed
    if (!newCurrentStep || originalStep.cvid !== newCurrentStep.cvid) {
      return;
    }

    this.currentStep = {
      ...newCurrentStep,
      trigger: remainingTriggers,
    };
  }

  /**
   * Get the current step info
   * @param currentStep - The current step
   * @returns The current step info
   */
  getCurrentStepInfo(currentStep: Step) {
    const steps = this.steps;
    const total = steps?.length ?? 0;
    const index = steps?.findIndex((step) => step.cvid === currentStep.cvid) ?? 0;
    const progress = Math.round(((index + 1) / total) * 100);

    return { total, index, progress };
  }

  /**
   * Reports the close event
   * @param reason - The reason for the close
   */
  private async reportCloseEvent(reason: contentEndReason) {
    await this.instance.socket?.endFlow(
      {
        sessionId: this.session.id,
        reason,
      },
      { batch: true },
    );
  }

  /**
   * Reports the tooltip target missing event
   * @param currentStep - The current step where target is missing
   */
  private async reportTooltipTargetMissingEvent(step: Step) {
    await this.instance.socket?.reportTooltipTargetMissing(
      {
        sessionId: this.session.id,
        stepId: String(step.id),
      },
      { batch: true },
    );
  }

  /**
   * Reports the step events
   * @param step - The step to report
   */
  private async reportStepEvents(step: Step) {
    await this.instance.socket?.goToStep(
      {
        sessionId: this.session.id,
        stepId: String(step.id),
      },
      { batch: true },
    );
  }

  /**
   * Get the store
   */
  getStore() {
    return this.store;
  }

  /**
   * Resets the tour
   */
  reset() {
    this.currentStep = undefined;
    this.store.setData(undefined);
  }

  /**
   * Destroys the tour
   */
  destroy() {
    // Clear all pending timeouts
    for (const timeoutId of this.triggerTimeouts) {
      clearTimeout(timeoutId);
    }
    this.triggerTimeouts = [];

    // Reset the tour
    this.reset();
    // Destroy the element watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
  }
}
