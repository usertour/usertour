import { smoothScroll } from '@usertour-packages/dom';
import {
  ContentEditorClickableElement,
  ContentEditorQuestionElement,
  isQuestionElement,
} from '@usertour-packages/shared-editor';
import {
  ContentActionsItemType,
  RulesCondition,
  Step,
  StepContentType,
  ThemeTypesSetting,
  contentEndReason,
} from '@usertour/types';
import { evalCode, isUndefined, isEqual } from '@usertour/helpers';
import { TourStore } from '@/types/store';
import { UsertourElementWatcher } from '@/core/usertour-element-watcher';
import { UsertourComponent } from '@/core/usertour-component';
import { UsertourTheme } from '@/core/usertour-theme';
import { UsertourTrigger } from '@/core/usertour-trigger';
import { document, logger } from '@/utils';

import { createQuestionAnswerEventData } from '@/core/usertour-helper';

import {
  ELEMENT_FOUND,
  ELEMENT_FOUND_TIMEOUT,
  ELEMENT_CHANGED,
} from '@usertour-packages/constants';

export class UsertourTour extends UsertourComponent<TourStore> {
  // Tour-specific constants
  private static readonly Z_INDEX_OFFSET = 200;

  // Tour-specific properties
  private watcher: UsertourElementWatcher | null = null;
  private stepTrigger: UsertourTrigger | null = null;
  private currentStep?: Step | null;

  /**
   * Checks the tour
   */
  async check(): Promise<void> {
    try {
      // Check if the current step is visible
      await this.checkTooltipVisibility();
      // Process triggers
      await this.checkAndProcessTrigger();
      // Check and update theme settings if needed
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      logger.error('Error in tour checking:', error);
      // Optionally handle the error or rethrow
      throw error;
    }
  }

  /**
   * Gets theme settings from session
   * @private
   */
  private async getThemeSettings(): Promise<ThemeTypesSetting | null> {
    const themeSettings = this.getVersionThemeSettings();
    const themeVariations = this.getVersionThemeVariations();
    if (!themeSettings) {
      logger.error('Theme settings not found');
      return null;
    }
    if (!themeVariations) {
      return themeSettings;
    }
    return await UsertourTheme.getThemeSettings(themeSettings, themeVariations);
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

    // Create trigger for this step if it has triggers
    if (currentStep.trigger?.length) {
      this.stepTrigger = new UsertourTrigger(currentStep.trigger, (actions) =>
        this.handleActions(actions),
      );
    }

    // Display step based on its type
    await this.displayStep(currentStep);
  }

  /**
   * Finds the target step by cvid or returns the first step
   * @private
   */
  private findTargetStep(cvid?: string): Step | null {
    const steps = this.getSteps();
    if (!steps.length) return null;

    const step = cvid ? this.getStepByCvid(cvid) : steps[0];
    return step?.cvid ? step : null;
  }

  /**
   * Builds the store data for the tour
   * This method combines the base store info with the current step data
   * and sets default values for required fields
   *
   * @returns {TourStore} The complete store data object
   */
  async buildStoreData(): Promise<TourStore | null> {
    const themeSettings = await this.getThemeSettings();
    if (!themeSettings) {
      return null;
    }

    const themeData = UsertourTheme.createThemeData(themeSettings);

    // Combine all store data with proper defaults
    return {
      triggerRef: null, // Reset trigger reference
      sdkConfig: this.instance.getSdkConfig(),
      ...themeData,
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
  private async showPopper(currentStep: Step): Promise<void> {
    // Validate step and target
    if (!this.canShowPopper(currentStep)) {
      logger.error('Step cannot be shown', { step: currentStep });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Report step seen event
    await this.reportStepSeen(currentStep);

    // Process trigger conditions
    await this.stepTrigger?.process();

    // Set up element watcher
    const store = await this.buildStoreData();
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
    this.watcher = new UsertourElementWatcher(step.target);
    const targetMissingSeconds = this.instance.getTargetMissingSeconds();
    if (!isUndefined(targetMissingSeconds)) {
      this.watcher.setTargetMissingSeconds(targetMissingSeconds);
    }

    // Handle element found
    this.watcher.once(ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, step, store);
      }
    });

    // Handle element not found
    this.watcher.once(ELEMENT_FOUND_TIMEOUT, async () => {
      await this.handleElementNotFound(step);
    });

    // Handle element changed
    this.watcher.on(ELEMENT_CHANGED, (el) => {
      if (el instanceof Element) {
        this.handleElementChanged(el, step, store);
      }
    });
    // Start watching
    this.watcher.findElement();
  }

  /**
   * Checks and updates the visibility of a tooltip step
   * @private
   */
  private async checkTooltipVisibility(): Promise<void> {
    const store = this.getStoreData();
    if (!store) {
      return;
    }
    const { triggerRef, currentStep, openState } = store;

    // Early return if not a tooltip or missing required data
    if (
      !triggerRef ||
      !this.watcher ||
      !currentStep?.cvid ||
      currentStep.type !== StepContentType.TOOLTIP
    ) {
      return;
    }

    // Check element visibility
    const { isHidden, isTimeout } = await this.watcher.checkVisibility();

    // Update visibility state
    if (!isHidden) {
      if (!openState) {
        this.open();
      }
      return;
    }

    // Handle timeout or hidden state
    if (isTimeout) {
      await this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
    } else {
      this.hide();
    }
  }

  /**
   * Checks if theme has changed and updates theme settings if needed
   */
  private async checkAndUpdateThemeSettings() {
    const themeSettings = await this.getThemeSettings();
    if (!themeSettings) {
      return;
    }

    // Get current theme settings from store
    const currentStore = this.getStoreData();
    const currentThemeSettings = currentStore?.themeSettings;

    // Check if theme settings have changed using isEqual for deep comparison
    if (!isEqual(currentThemeSettings, themeSettings)) {
      this.updateStore({
        themeSettings,
      });
    }
  }

  /**
   * Checks and processes the trigger for the current step
   */
  private async checkAndProcessTrigger(): Promise<void> {
    if (this.stepTrigger) {
      await this.stepTrigger.process();
    }
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
    this.setStoreData({
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
    this.setStoreData({
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
  private async showModal(currentStep: Step) {
    // Build store data and get step information
    const store = await this.buildStoreData();
    if (!store) {
      logger.error('Store not found', { step: currentStep });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    const stepInfo = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepSeen(currentStep);

    // Process trigger conditions
    await this.stepTrigger?.process();

    // Set up modal state
    this.setStoreData({
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
  private async showHidden(currentStep: Step) {
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

    // Execute other actions first, then navigation actions
    await this.executeActions(otherActions);
    await this.executeActions(pageNavigateActions);
  }

  /**
   * Executes all actions in sequence
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
      case ContentActionsItemType.PAGE_NAVIGATE:
        this.instance.handleNavigate(action.data);
        break;
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
      await this.handleActions(element.data.actions as RulesCondition[]);
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
  private async reportQuestionAnswer(element: ContentEditorQuestionElement, value?: any) {
    const eventData = createQuestionAnswerEventData(element, value, this.getSessionId());
    await this.socketService.answerQuestion(eventData, { batch: true });
  }

  /**
   * Get the current step info for store data
   * @param currentStep - The current step
   * @returns Store data with step info
   */
  private getCurrentStepInfo(currentStep: Step) {
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
    await this.socketService.endFlow(
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
    await this.socketService.reportTooltipTargetMissing(
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
    await this.socketService.goToStep(
      {
        sessionId: this.getSessionId(),
        stepId: String(step.id),
      },
      { batch: true },
    );
  }

  /**
   * Resets the tour
   */
  reset() {
    this.currentStep = undefined;
    this.setStoreData(undefined);

    this.stepTrigger = null;
    this.watcher = null;
  }

  /**
   * Destroys the tour
   */
  destroy() {
    // Stop checking (inherited from UsertourComponent)
    this.stopChecking();
    this.stepTrigger?.destroy();
    // Destroy the element watcher
    this.watcher?.destroy();
    // Reset the tour (includes trigger cleanup)
    this.reset();
  }
}
