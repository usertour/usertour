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

import { UsertourCore } from './usertour-core';
import { AnswerQuestionDto } from '@/types/web-socket';
import { Session } from './session';
import { logger } from '@/utils/logger';

export class UsertourTour extends Evented {
  // Constants
  private static readonly Z_INDEX_OFFSET = 200;
  private static readonly MAX_WAIT_TIME = 300; // Maximum wait time in seconds

  private watcher: ElementWatcher | null = null;
  private triggerTimeouts: NodeJS.Timeout[] = []; // Store timeout IDs
  private currentStep?: Step | null;
  private store: ExternalStore<TourStore>;
  private readonly session: Session;
  private readonly instance: UsertourCore;
  private readonly id: string;

  constructor(instance: UsertourCore, session: Session) {
    super();
    autoBind(this);
    this.session = session;
    this.instance = instance;
    this.store = new ExternalStore<TourStore>(undefined);
    this.id = this.getSessionId();
  }

  /**
   * Gets the session ID
   */
  private getSessionId(): string {
    return this.session.getSessionId();
  }

  /**
   * Gets the tour ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the steps array from session
   * @private
   */
  private getSteps(): Step[] {
    return this.session.getSteps();
  }

  /**
   * Gets theme settings from session
   * @private
   */
  private getThemeSettings() {
    const themeSettings = this.session.getThemeSettings();
    if (!themeSettings) {
      logger.error('Theme settings not found');
      return null;
    }
    return themeSettings;
  }

  /**
   * Shows a specific step in the tour by its cvid, or the first step if no cvid is provided
   * @param cvid - Optional cvid of the step to show. If not provided, shows the first step
   * @returns Promise that resolves when the step is shown, or rejects if the tour cannot be shown
   */
  async show(cvid?: string): Promise<void> {
    // Early return if tour cannot start
    if (!this.hasSteps()) {
      logger.error('No steps found', { steps: this.getSteps() });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Find the target step
    const currentStep = this.findTargetStep(cvid);
    if (!currentStep) {
      logger.error('currentStep not found', { cvid });
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
   * Checks if the tour has steps
   * @private
   */
  private hasSteps(): boolean {
    return Boolean(this.getSteps().length);
  }

  /**
   * Finds the target step by cvid or returns the first step
   * @private
   */
  private findTargetStep(cvid?: string): Step | null {
    const steps = this.getSteps();
    if (!steps.length) return null;

    const step = cvid ? getStepByCvid(steps, cvid) : steps[0];
    return step?.cvid ? step : null;
  }

  /**
   * Builds the store data for the tour
   * This method combines the base store info with the current step data
   * and sets default values for required fields
   *
   * @returns {TourStore} The complete store data object
   */
  private buildStoreData(): TourStore | null {
    const themeSettings = this.getThemeSettings();
    if (!themeSettings) {
      return null;
    }

    // Combine all store data with proper defaults
    return {
      triggerRef: null, // Reset trigger reference
      sdkConfig: this.instance.getSdkConfig(),
      assets: getAssets(themeSettings),
      globalStyle: convertToCssVars(convertSettings(themeSettings)),
      themeSettings: themeSettings,
      userAttributes: {},
      openState: false,
      currentStep: this.currentStep,
      zIndex: this.getCalculatedZIndex(),
    } as TourStore;
  }

  /**
   * Calculates the z-index for the tour
   * @private
   */
  private getCalculatedZIndex(): number {
    const baseZIndex = this.instance.getBaseZIndex() ?? 0;
    return baseZIndex + UsertourTour.Z_INDEX_OFFSET;
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
      logger.error('Step type not found', { step });
      await this.close(contentEndReason.SYSTEM_CLOSED);
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
    if (!this.canShowPopper(currentStep)) {
      logger.error('Step cannot be shown', { step: currentStep });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Report step seen event
    await this.reportStepSeen(currentStep);

    // Process trigger conditions
    await this.processTriggers();

    // Set up element watcher
    const store = this.buildStoreData();
    if (!store) {
      logger.error('Store not found', { step: currentStep });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    this.setupElementWatcher(currentStep, store);
  }

  /**
   * Checks if a popper step can be shown
   * @private
   */
  private canShowPopper(step: Step): boolean {
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
      logger.error('Step target not found', { step });
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
    const stepInfo = this.getCurrentStepInfo(step);

    // Scroll element into view if tour is visible
    smoothScroll(el, { block: 'center' });

    // Update store
    this.store.setData({
      ...store,
      ...stepInfo,
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
    await this.reportTargetMissing(step);
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
    if (!store) {
      logger.error('Store not found', { step: currentStep });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    const stepInfo = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepSeen(currentStep);

    // Process trigger conditions
    await this.processTriggers();

    // Set up modal state
    this.store.setData({
      ...store,
      ...stepInfo,
      openState: true,
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
    await this.reportStepSeen(currentStep);
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
    // Separate actions by type
    const pageNavigateActions = actions.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actions.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );

    await this.executeActions(otherActions);
    await this.executeNavigations(pageNavigateActions);
  }

  /**
   * Executes non-navigation actions
   * @private
   */
  private async executeActions(actions: RulesCondition[]) {
    for (const action of actions) {
      await this.executeAction(action);
    }
  }

  /**
   * Executes a single action
   * @private
   */
  private async executeAction(action: RulesCondition) {
    switch (action.type) {
      case ContentActionsItemType.STEP_GOTO:
        await this.show(action.data.stepCvid);
        break;
      case ContentActionsItemType.FLOW_START:
        await this.instance.startTour(action.data.contentId, action.data.stepCvid);
        break;
      case ContentActionsItemType.FLOW_DISMIS:
        await this.handleClose(contentEndReason.USER_CLOSED);
        break;
      case ContentActionsItemType.JAVASCRIPT_EVALUATE:
        evalCode(action.data.value);
        break;
    }
  }

  /**
   * Executes navigation actions
   * @private
   */
  private async executeNavigations(actions: RulesCondition[]) {
    for (const action of actions) {
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
      sessionId: this.getSessionId(),
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
   * Processes trigger conditions for the current step
   * This method:
   * 1. Processes each trigger's conditions
   * 2. Executes actions for triggers with met conditions
   * 3. Updates the step with remaining triggers
   *
   * @returns {Promise<void>}
   */
  async processTriggers(): Promise<void> {
    const currentStep = this.currentStep;

    // Early return if no triggers to process
    if (!currentStep?.trigger?.length) {
      return;
    }

    // Process triggers and collect remaining ones
    const remainingTriggers = await this.processStepTriggers(currentStep.trigger);

    // Update step with remaining triggers if step hasn't changed
    await this.updateStepTriggers(currentStep, remainingTriggers);
  }

  /**
   * Processes a list of triggers and executes actions for those with met conditions
   * @private
   */
  private async processStepTriggers(triggers: StepTrigger[]): Promise<StepTrigger[]> {
    const remainingTriggers: StepTrigger[] = [];
    const MAX_WAIT_TIME = UsertourTour.MAX_WAIT_TIME;
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
  private async updateStepTriggers(
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
   * Get the current step info for store data
   * @param currentStep - The current step
   * @returns Store data with step info
   */
  getCurrentStepInfo(currentStep: Step) {
    const steps = this.getSteps();
    // Early return for edge cases
    if (!steps.length) {
      return {
        totalSteps: 0,
        currentStepIndex: 0,
        progress: 0,
      };
    }

    const total = steps.length;
    const index = steps.findIndex((step) => step.cvid === currentStep.cvid);
    const validIndex = index === -1 ? 0 : index;
    const progress = Math.round(((validIndex + 1) / total) * 100);

    return {
      totalSteps: total,
      currentStepIndex: validIndex,
      progress,
    };
  }

  /**
   * Reports the close event
   * @param reason - The reason for the close
   */
  private async reportCloseEvent(reason: contentEndReason) {
    await this.instance.socket?.endFlow(
      {
        sessionId: this.getSessionId(),
        reason,
      },
      { batch: true },
    );
  }

  /**
   * Reports the tooltip target missing event
   * @param step - The step where target is missing
   */
  private async reportTargetMissing(step: Step) {
    await this.instance.socket?.reportTooltipTargetMissing(
      {
        sessionId: this.getSessionId(),
        stepId: String(step.id),
      },
      { batch: true },
    );
  }

  /**
   * Reports step seen event
   * @param step - The step to report
   */
  private async reportStepSeen(step: Step) {
    await this.instance.socket?.goToStep(
      {
        sessionId: this.getSessionId(),
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
