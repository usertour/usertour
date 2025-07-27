import { smoothScroll } from '@usertour-packages/dom';
import {
  ContentEditorClickableElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  isQuestionElement,
} from '@usertour-packages/shared-editor';
import {
  BizEvents,
  ContentActionsItemType,
  EventAttributes,
  RulesCondition,
  SDKContent,
  Step,
  StepContentType,
  StepTrigger,
  contentEndReason,
} from '@usertour/types';
import { evalCode } from '@usertour/helpers';
import { TourStore } from '../types/store';
import { activedRulesConditions, flowIsDismissed, isActive } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { BaseContent } from './base-content';
import { ElementWatcher } from './element-watcher';
import { logger } from '../utils/logger';
import { getStepByCvid } from '../utils/content-utils';

export class Tour extends BaseContent<TourStore> {
  private watcher: ElementWatcher | null = null;
  private triggerTimeouts: NodeJS.Timeout[] = []; // Store timeout IDs
  private flowCompletedReported = false; // Track if FLOW_COMPLETED has been reported

  /**
   * Monitors and updates the tour state
   * This method handles:
   * 1. Checking step visibility for active tours
   * 2. Activating trigger conditions
   * 3. Activating content conditions
   *
   * @returns {Promise<void>}
   */
  async monitor(): Promise<void> {
    try {
      // Always activate content conditions
      await this.activeContentConditions();

      // Handle active tour monitoring
      if (this.isActiveTour()) {
        // Check if the current step is visible
        await this.checkStepVisible();
        // Activate any trigger conditions
        await this.activeTriggerConditions();
        // Check and update theme settings if needed
        await this.checkAndUpdateThemeSettings();
      }
    } catch (error) {
      logger.error('Error in tour monitoring:', error);
      // Optionally handle the error or rethrow
      throw error;
    }
  }

  /**
   * Shows a specific step in the tour by its cvid, or the first step if no cvid is provided
   * @param cvid - Optional cvid of the step to show. If not provided, shows the first step
   * @returns Promise that resolves when the step is shown, or rejects if the tour cannot be shown
   */
  async show(cvid?: string): Promise<void> {
    const content = this.getContent();

    // Validate content is valid
    if (!this.isValidTour(content)) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    const steps = content.steps ?? [];
    // Find the target step
    const step = cvid ? getStepByCvid(steps, cvid) : steps[0];

    // If no valid step found, close the tour
    if (!step?.cvid) {
      await this.close(contentEndReason.STEP_NOT_FOUND);
      return;
    }

    // Reset tour state and set new step
    this.reset();
    this.setCurrentStep(step);

    // Display step based on its type
    await this.displayStep(step);
  }

  /**
   * Refreshes the current step with the latest content data
   * This method updates the current step with any changes from the content definition
   * while preserving the current trigger state
   * @returns void
   */
  async refresh(): Promise<void> {
    const content = this.getContent();
    const currentStep = this.getCurrentStep();

    // Early return if no current step or content steps
    if (!currentStep?.cvid || !content.steps?.length) {
      return;
    }

    // Find the updated step definition
    const updatedStep = content.steps.find((step) => step.cvid === currentStep.cvid);
    if (!updatedStep) {
      return;
    }

    // Preserve current trigger state while updating other properties
    const { trigger, ...rest } = updatedStep;
    const preservedStep = {
      ...rest,
      trigger: trigger?.filter((t) =>
        currentStep.trigger?.some((currentTrigger) => currentTrigger.id === t.id),
      ),
    };

    // Update the current step
    this.setCurrentStep(preservedStep);

    // Update store with new data
    const { openState, triggerRef, progress, ...storeData } = await this.buildStoreData();
    this.updateStore({
      ...storeData,
      currentStep: preservedStep,
    });
  }

  /**
   * Gets the ID of the latest session that can be reused
   * A session can be reused if:
   * 1. The content has data and a latest session
   * 2. The flow has not been dismissed
   *
   * @returns {string | null} The session ID if it can be reused, null otherwise
   */
  getReusedSessionId(): string | null {
    const content = this.getContent();

    // Check if content has required data
    if (!content.data || !content.latestSession) {
      return null;
    }

    // Check if flow has been dismissed
    if (flowIsDismissed(content.latestSession)) {
      return null;
    }

    return content.latestSession.id;
  }

  /**
   * Ends the latest session
   */
  async endLatestSession(reason: contentEndReason) {
    const eventData: Record<string, any> = {
      [EventAttributes.FLOW_END_REASON]: reason,
      [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
      [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
    };
    const sessionId = this.getReusedSessionId();
    if (!sessionId) {
      return;
    }

    await this.reportEventWithSession({
      sessionId,
      eventName: BizEvents.FLOW_ENDED,
      eventData,
    });

    // Remove the latest session from the content
    this.removeContentLatestSession();
  }

  /**
   * Builds the store data for the tour
   * This method combines the base store info with the current step data
   * and sets default values for required fields
   *
   * @returns {TourStore} The complete store data object
   */
  private async buildStoreData(): Promise<TourStore> {
    // Get base store information
    const baseInfo = await this.getStoreBaseInfo();
    const currentStep = this.getCurrentStep();
    const zIndex = this.getBaseZIndex();

    // Combine all store data with proper defaults
    return {
      triggerRef: null, // Reset trigger reference
      ...baseInfo, // Add base information
      currentStep, // Add current step
      openState: true, // Set initial open state
      zIndex: zIndex + 200,
    } as TourStore;
  }

  /**
   * Validates if the tour is valid
   * @param content - The content to validate
   * @returns {boolean} True if the tour is valid, false otherwise
   */
  private isValidTour(content: SDKContent): boolean {
    const userInfo = this.getUserInfo();
    return Boolean(content.steps?.length && userInfo?.externalId);
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
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);

    // Activate trigger conditions
    await this.activeTriggerConditions();

    // Set up element watcher
    const store = await this.buildStoreData();
    this.setupElementWatcher(currentStep, store);

    const { isComplete } = this.getCurrentStepInfo(currentStep);
    if (isComplete) {
      await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
    }
  }

  /**
   * Validates if a step can be displayed as a popper
   * @private
   */
  private isValidPopperStep(step: Step): boolean {
    return Boolean(step?.target && step.cvid === this.getCurrentStep()?.cvid && document);
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
    this.watcher.setTargetMissingSeconds(this.getTargetMissingSeconds());

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
  private async handleElementFound(el: Element, step: Step, store: TourStore): Promise<void> {
    const openState = !(await this.isTemporarilyHidden());
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    const { progress, index, total } = this.getCurrentStepInfo(step);

    // Scroll element into view if tour is visible
    if (openState) {
      smoothScroll(el, { block: 'center' });
    }

    // Update store
    this.setStore({
      ...store,
      progress,
      currentStepIndex: index,
      totalSteps: total,
      triggerRef: el,
      openState,
    });

    // If the tour is temporarily hidden, unset the active tour
    if (!openState) {
      this.unsetActiveTour();
    }
  }

  private handleElementChanged(el: Element, step: Step, store: TourStore): void {
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }

    // Update store
    this.setStore({
      ...store,
      triggerRef: el,
    });
  }

  /**
   * Handles when the target element is not found
   * @private
   */
  private async handleElementNotFound(step: Step): Promise<void> {
    const currentStep = this.getCurrentStep();
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
    const store = await this.buildStoreData();
    const { progress, isComplete, index, total } = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);

    // Activate trigger conditions
    await this.activeTriggerConditions();

    // Set up modal state
    const openState = !(await this.isTemporarilyHidden());
    this.setStore({
      ...store,
      openState,
      progress,
      currentStepIndex: index, // Convert to 0-based index
      totalSteps: total,
    });

    // If this is the last step, report completion
    if (isComplete) {
      await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
    }

    // If the tour is temporarily hidden, unset the active tour
    if (!openState) {
      this.unsetActiveTour();
    }
  }

  /**
   * Displays a hidden step in the tour
   * This method handles:
   * 1. Reporting the step seen event
   * 2. Reporting the completion event if it's the last step
   *
   */
  async showHidden(currentStep: Step) {
    const { isComplete } = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);

    // If this is the last step, report completion
    if (isComplete) {
      await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
    }
  }

  /**
   * Close the current tour
   * This method handles:
   * 1. Validating the tour state
   * 2. Reporting the close event
   * 3. Setting the tour as dismissed
   * 4. Cleaning up resources
   *
   * @param reason - The reason for closing the tour, defaults to USER_CLOSED
   */
  async close(reason: contentEndReason = contentEndReason.USER_CLOSED) {
    // Report close event
    await this.reportCloseEvent(reason);
    // Set the tour as dismissed
    this.setDismissed(true);
    // Set the tour as not started
    this.setStarted(false);
    // Destroy the tour
    this.destroy();
  }

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
        await this.startNewContent(action.data.contentId, action.data.stepCvid);
      } else if (action.type === ContentActionsItemType.FLOW_DISMIS) {
        await this.handleClose(contentEndReason.USER_CLOSED);
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      }
    }

    // Execute PAGE_NAVIGATE actions last
    for (const action of pageNavigateActions) {
      this.handleNavigate(action.data);
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
        await this.updateUser({
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
    const eventData: any = {
      [EventAttributes.QUESTION_CVID]: cvid,
      [EventAttributes.QUESTION_NAME]: data.name,
      [EventAttributes.QUESTION_TYPE]: type,
    };
    if (element.type === ContentEditorElementType.MULTIPLE_CHOICE) {
      if (element.data.allowMultiple) {
        eventData[EventAttributes.LIST_ANSWER] = value as string[];
      } else {
        eventData[EventAttributes.TEXT_ANSWER] = value;
      }
    } else if (
      element.type === ContentEditorElementType.SCALE ||
      element.type === ContentEditorElementType.NPS ||
      element.type === ContentEditorElementType.STAR_RATING
    ) {
      eventData[EventAttributes.NUMBER_ANSWER] = value;
    } else if (
      element.type === ContentEditorElementType.SINGLE_LINE_TEXT ||
      element.type === ContentEditorElementType.MULTI_LINE_TEXT
    ) {
      eventData[EventAttributes.TEXT_ANSWER] = value;
    }
    await this.reportEventWithSession({
      eventName: BizEvents.QUESTION_ANSWERED,
      eventData,
    });
  }

  /**
   * Checks and updates the visibility state of the current step
   * This method handles:
   * 1. Validating the current step state
   * 2. Handling temporarily hidden state
   * 3. Managing modal visibility
   * 4. Checking tooltip target visibility
   *
   * @returns {Promise<void>}
   */
  async checkStepVisible(): Promise<void> {
    const store = this.getStore()?.getSnapshot();
    if (!store) {
      return;
    }
    const { triggerRef, currentStep, openState } = store;

    // Early return if no current step
    if (!this.getCurrentStep() || !currentStep) {
      return;
    }

    // Handle temporarily hidden state
    if (await this.isTemporarilyHidden()) {
      if (openState) {
        this.hide();
      }
      this.unsetActiveTour();
      return;
    }

    // Handle modal visibility
    if (currentStep.type === StepContentType.MODAL) {
      if (!openState) {
        this.open();
      }
      return;
    }

    // Handle tooltip visibility
    await this.checkTooltipVisibility(currentStep, triggerRef, openState);
  }

  /**
   * Checks and updates the visibility of a tooltip step
   * @private
   */
  private async checkTooltipVisibility(
    currentStep: Step,
    triggerRef: Element | null,
    currentOpenState: boolean,
  ): Promise<void> {
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
      if (!currentOpenState) {
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
   * Activates and processes trigger conditions for the current step
   * This method:
   * 1. Processes each trigger's conditions
   * 2. Executes actions for triggers with met conditions
   * 3. Updates the step with remaining triggers
   *
   * @returns {Promise<void>}
   */
  async activeTriggerConditions(): Promise<void> {
    const currentStep = this.getCurrentStep();

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
    const newCurrentStep = this.getCurrentStep();

    // Only update if the step hasn't changed
    if (!newCurrentStep || originalStep.cvid !== newCurrentStep.cvid) {
      return;
    }

    this.setCurrentStep({
      ...newCurrentStep,
      trigger: remainingTriggers,
    });
  }

  /**
   * Checks if this tour instance is the currently active tour
   * @returns {boolean} True if this tour is the active tour, false otherwise
   */
  isActiveTour(): boolean {
    return this.getActiveTour() === this;
  }

  /**
   * Checks if the tour is currently visible and active
   * A tour is considered shown when:
   * 1. It is the active tour
   * 2. It has a current step
   * 3. Its open state is true
   *
   * @returns {boolean} True if the tour is visible and active, false otherwise
   */
  isShow(): boolean {
    const openState = this.getStore().getSnapshot()?.openState || false;
    return this.isActiveTour() && Boolean(this.getCurrentStep()) && openState;
  }

  /**
   * Resets the tour
   */
  reset() {
    this.setCurrentStep(null);
    this.setStore(undefined);
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

    // Unset the active tour reference
    if (this.isActiveTour()) {
      this.unsetActiveTour();
    }
    // Reset the tour
    this.reset();
    // Destroy the element watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
  }

  /**
   * Initializes event listeners
   */
  initializeEventListeners() {}

  /**
   * Get detailed information about the current step
   * @param currentStep - The current step to get information for
   * @returns Object containing step information including:
   *          - total: Total number of steps in the tour
   *          - index: Current step index (0-based)
   *          - progress: Progress percentage (0-100)
   *          - isComplete: Whether this is the last step
   */
  getCurrentStepInfo(currentStep: Step) {
    const content = this.getContent();
    const total = content.steps?.length ?? 0;
    const index = content.steps?.findIndex((step) => step.cvid === currentStep.cvid) ?? 0;
    const progress = Math.round(((index + 1) / total) * 100);
    const isExplicitCompletionStep = currentStep.setting.explicitCompletionStep;
    const isComplete = isExplicitCompletionStep ? isExplicitCompletionStep : index + 1 === total;

    return { total, index, progress, isComplete };
  }

  /**
   * Handle additional logic after content is shown
   * @param _isNewSession - Whether this is a new session
   */
  async handleAfterShow(_isNewSession?: boolean) {
    // Tour has no additional logic, can be empty implementation
  }

  /**
   * Reports the close event
   * @param reason - The reason for the close
   */
  private async reportCloseEvent(reason: contentEndReason) {
    const currentStep = this.getCurrentStep();
    const eventData: Record<string, any> = {
      [EventAttributes.FLOW_END_REASON]: reason,
      [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
      [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
    };

    if (currentStep) {
      const { index, progress } = this.getCurrentStepInfo(currentStep);
      Object.assign(eventData, {
        [EventAttributes.FLOW_STEP_NUMBER]: index,
        [EventAttributes.FLOW_STEP_CVID]: currentStep.cvid,
        [EventAttributes.FLOW_STEP_NAME]: currentStep.name,
        [EventAttributes.FLOW_STEP_PROGRESS]: progress,
      });
    }

    await this.reportEventWithSession({
      eventName: BizEvents.FLOW_ENDED,
      eventData,
    });
  }

  /**
   * Reports the tooltip target missing event
   * @param currentStep - The current step where target is missing
   */
  private async reportTooltipTargetMissingEvent(currentStep: Step) {
    const { index, progress } = this.getCurrentStepInfo(currentStep);

    await this.reportEventWithSession({
      eventName: BizEvents.TOOLTIP_TARGET_MISSING,
      eventData: {
        [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
        [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
        [EventAttributes.FLOW_STEP_NUMBER]: index,
        [EventAttributes.FLOW_STEP_CVID]: currentStep.cvid,
        [EventAttributes.FLOW_STEP_NAME]: currentStep.name,
        [EventAttributes.FLOW_STEP_PROGRESS]: progress,
      },
    });
  }

  /**
   * Reports the step events
   * @param currentStep - The current step
   * @param index - The index of the current step
   * @param progress - The progress of the current step
   * @param isComplete - Whether the current step is complete
   */
  private async reportStepEvents(currentStep: Step, eventName: BizEvents) {
    // Check if this is a FLOW_COMPLETED event and if it has already been reported
    if (eventName === BizEvents.FLOW_COMPLETED && this.flowCompletedReported) {
      return;
    }

    const { index, progress } = this.getCurrentStepInfo(currentStep);

    const eventData = {
      [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
      [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
      [EventAttributes.FLOW_STEP_NUMBER]: index,
      [EventAttributes.FLOW_STEP_CVID]: currentStep.cvid,
      [EventAttributes.FLOW_STEP_NAME]: currentStep.name,
      [EventAttributes.FLOW_STEP_PROGRESS]: Math.round(progress),
    };

    await this.reportEventWithSession({
      eventData,
      eventName,
    });

    // Mark FLOW_COMPLETED as reported if this was a completion event
    if (eventName === BizEvents.FLOW_COMPLETED) {
      this.flowCompletedReported = true;
    }
  }
}
