import { smoothScroll } from '@usertour-ui/dom';
import {
  ContentEditorClickableElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  isQuestionElement,
} from '@usertour-ui/shared-editor';
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
} from '@usertour-ui/types';
import { evalCode } from '@usertour-ui/ui-utils';
import { TourStore } from '../types/store';
import { activedRulesConditions, flowIsDismissed, isActive } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { type App } from './app';
import { BaseContent } from './base-content';
import { defaultTourStore } from './common';
import { ElementWatcher } from './element-watcher';
import { logger } from '../utils/logger';

export class Tour extends BaseContent<TourStore> {
  private watcher: ElementWatcher | null = null;
  private triggerTimeouts: NodeJS.Timeout[] = []; // Store timeout IDs

  constructor(instance: App, content: SDKContent) {
    super(instance, content, defaultTourStore);
  }

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
      // Handle active tour monitoring
      if (this.isActiveTour()) {
        await this.monitorActiveTour();
      }

      // Always activate content conditions
      await this.activeContentConditions();
    } catch (error) {
      logger.error('Error in tour monitoring:', error);
      // Optionally handle the error or rethrow
      throw error;
    }
  }

  /**
   * Monitors an active tour by checking visibility and trigger conditions
   * @private
   */
  private async monitorActiveTour(): Promise<void> {
    // Check if the current step is visible
    await this.checkStepVisible();

    // Activate any trigger conditions
    await this.activeTriggerConditions();
  }

  /**
   * Shows a specific step in the tour by its cvid, or the first step if no cvid is provided
   * @param cvid - Optional cvid of the step to show. If not provided, shows the first step
   * @returns Promise that resolves when the step is shown, or rejects if the tour cannot be shown
   */
  async show(cvid?: string): Promise<void> {
    const content = this.getContent();

    // Validate content has steps
    if (!content.steps?.length) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Find the target step
    const targetStep = cvid ? content.steps.find((step) => step.cvid === cvid) : content.steps[0];

    // If no valid step found, close the tour
    if (!targetStep?.cvid) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Navigate to the target step
    await this.goto(targetStep.cvid);
  }

  /**
   * Refreshes the current step with the latest content data
   * This method updates the current step with any changes from the content definition
   * while preserving the current trigger state
   * @returns void
   */
  refresh(): void {
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
    const { openState, triggerRef, progress, ...storeData } = this.buildStoreData();
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
    if (flowIsDismissed(content)) {
      return null;
    }

    return content.latestSession.id;
  }

  /**
   * Ends the latest session
   */
  async endLatestSession(reason: contentEndReason) {
    const eventData: Record<string, any> = {
      flow_end_reason: reason,
    };
    const sessionId = this.getReusedSessionId();
    if (!sessionId) {
      return;
    }

    await this.reportEventWithSession(
      {
        sessionId,
        eventName: BizEvents.FLOW_ENDED,
        eventData,
      },
      { isDeleteSession: true },
    );

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
  private buildStoreData(): TourStore {
    // Get base store information
    const baseInfo = this.getStoreBaseInfo();
    const currentStep = this.getCurrentStep();

    // Combine all store data with proper defaults
    return {
      ...defaultTourStore, // Start with default values
      triggerRef: null, // Reset trigger reference
      ...baseInfo, // Add base information
      currentStep, // Add current step
      openState: true, // Set initial open state
    } as TourStore;
  }

  /**
   * Get a step by its cvid
   * @param cvid - The cvid of the step to get
   * @returns The step with the given cvid, or null if it doesn't exist
   */
  getStepByCvid(cvid: string): Step | null {
    if (!cvid) {
      return null;
    }
    const content = this.getContent();
    if (!content?.steps?.length) {
      return null;
    }
    return content.steps.find((step) => step.cvid === cvid) ?? null;
  }

  /**
   * Navigates to a specific step in the tour by its cvid
   * This method handles:
   * 1. Validating user and content state
   * 2. Finding and setting the target step
   * 3. Displaying the step based on its type (tooltip or modal)
   *
   * @param stepCvid - The cvid of the step to navigate to
   * @throws Will close the tour if validation fails or step is not found
   */
  async goto(stepCvid: string): Promise<void> {
    // Validate user and content state
    const userInfo = this.getUserInfo();
    const content = this.getContent();

    if (!this.isValidTourState(content, userInfo)) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Find and validate target step
    const targetStep = this.getStepByCvid(stepCvid);
    if (!targetStep) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Reset tour state and set new step
    this.reset();
    this.setCurrentStep(targetStep);

    // Display step based on its type
    await this.displayStep(targetStep);
  }

  /**
   * Validates if the tour can proceed with the current state
   * @private
   */
  private isValidTourState(content: SDKContent, userInfo: any): boolean {
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
    const store = this.buildStoreData();
    this.setupElementWatcher(currentStep, store);
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
      this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    this.watcher = new ElementWatcher(step.target);
    this.watcher.setTargetMissingSeconds(this.getTargetMissingSeconds());

    // Handle element found
    this.watcher.once('element-found', (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, step, store);
      }
    });

    // Handle element not found
    this.watcher.once('element-found-timeout', async () => {
      await this.handleElementNotFound(step);
    });

    // Start watching
    this.watcher.findElement();
  }

  /**
   * Handles when the target element is found
   * @private
   */
  private handleElementFound(el: Element, step: Step, store: TourStore): void {
    const openState = !this.isTemporarilyHidden();
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    const { isComplete, progress } = this.getCurrentStepInfo(step);

    // Scroll element into view if tour is visible
    if (openState) {
      smoothScroll(el, { block: 'center' });
    }

    // Update store
    this.setStore({
      ...store,
      progress,
      triggerRef: el,
      openState,
    });

    // Report completion if this is the last step
    if (isComplete) {
      this.reportStepEvents(step, BizEvents.FLOW_COMPLETED);
    }
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
    const store = this.buildStoreData();
    const { progress, isComplete } = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);

    // Activate trigger conditions
    await this.activeTriggerConditions();

    // Set up modal state
    const openState = !this.isTemporarilyHidden();
    this.setStore({ ...store, openState, progress });

    // If this is the last step, report completion
    if (isComplete) {
      await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
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
        await this.goto(action.data.stepCvid);
      } else if (action.type === ContentActionsItemType.FLOW_START) {
        await this.startNewTour(action.data.contentId);
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
      await this.refreshContents();
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
    const { triggerRef, currentStep, openState } = this.getStore().getSnapshot();

    // Early return if no current step
    if (!this.getCurrentStep() || !currentStep) {
      return;
    }

    // Handle temporarily hidden state
    if (this.isTemporarilyHidden()) {
      if (openState) {
        this.hide();
      }
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
      await this.close(contentEndReason.SYSTEM_CLOSED);
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
    const { openState } = this.getStore().getSnapshot();
    return this.isActiveTour() && Boolean(this.getCurrentStep()) && openState;
  }

  /**
   * Resets the tour
   */
  reset() {
    this.setCurrentStep(null);
    this.setStore(defaultTourStore);
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
  initializeEventListeners() {
    this.once(AppEvents.CONTENT_AUTO_START_ACTIVATED, async (args: any) => {
      await this.reportAutoStartEvent(args.reason);
    });
  }

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
    const isComplete = index + 1 === total;

    return { total, index, progress, isComplete };
  }

  /**
   * Reports the auto start event
   * @param reason - The reason for the auto start
   */
  async reportAutoStartEvent(reason?: string) {
    await this.reportEventWithSession(
      {
        eventName: BizEvents.FLOW_STARTED,
        eventData: {
          flow_start_reason: reason ?? 'auto_start',
        },
      },
      { isCreateSession: true },
    );
  }

  /**
   * Reports the close event
   * @param reason - The reason for the close
   */
  private async reportCloseEvent(reason: contentEndReason) {
    const currentStep = this.getCurrentStep();
    const eventData: Record<string, any> = {
      flow_end_reason: reason,
    };

    if (currentStep) {
      const { index, progress } = this.getCurrentStepInfo(currentStep);
      Object.assign(eventData, {
        flow_step_number: index,
        flow_step_cvid: currentStep.cvid,
        flow_step_name: currentStep.name,
        flow_step_progress: progress,
      });
    }

    await this.reportEventWithSession(
      {
        eventName: BizEvents.FLOW_ENDED,
        eventData,
      },
      { isDeleteSession: true },
    );
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
        flow_step_number: index,
        flow_step_cvid: currentStep.cvid,
        flow_step_name: currentStep.name,
        flow_step_progress: progress,
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
    const { index, progress } = this.getCurrentStepInfo(currentStep);

    const eventData = {
      flow_step_number: index,
      flow_step_cvid: currentStep.cvid,
      flow_step_name: currentStep.name,
      flow_step_progress: Math.round(progress),
    };
    const isDeleteSession = eventName === BizEvents.FLOW_COMPLETED;

    await this.reportEventWithSession(
      {
        eventData,
        eventName,
      },
      { isDeleteSession },
    );
  }
}
