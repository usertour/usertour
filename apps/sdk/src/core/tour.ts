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

export class Tour extends BaseContent<TourStore> {
  private watcher: ElementWatcher | null = null;

  constructor(instance: App, content: SDKContent) {
    super(instance, content, defaultTourStore);
  }

  async monitor() {
    if (this.isActiveTour()) {
      this.checkStepVisible();
      this.activeTriggerConditions();
    }
    await this.activeContentConditions();
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

  getReusedSessionId() {
    const content = this.getContent();
    if (!content.data || !content.latestSession) {
      return null;
    }
    const isDismissed = flowIsDismissed(content);
    if (isDismissed) {
      return null;
    }
    return content.latestSession.id;
  }

  private buildStoreData() {
    const baseInfo = this.getStoreBaseInfo();
    const currentStep = this.getCurrentStep();
    return {
      ...defaultTourStore,
      triggerRef: null,
      ...baseInfo,
      currentStep,
      openState: true,
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

  async goto(stepCvid: string) {
    const userInfo = this.getUserInfo();
    const content = this.getContent();
    if (!content.steps || !userInfo || !userInfo.externalId) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    const currentStep = this.getStepByCvid(stepCvid);
    if (!currentStep) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    this.reset();
    this.setCurrentStep(currentStep);

    if (currentStep.type === 'tooltip') {
      await this.showPopper(currentStep);
    } else if (currentStep.type === 'modal') {
      await this.showModal(currentStep);
    }
  }

  async showPopper(currentStep: Step) {
    if (!currentStep?.target || currentStep.cvid !== this.getCurrentStep()?.cvid || !document) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    const store = this.buildStoreData();
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);
    this.watcher = new ElementWatcher(currentStep.target);
    this.watcher.once('element-found', (el) => {
      const openState = !this.isTemporarilyHidden();
      const { isComplete, progress } = this.getCurrentStepInfo(currentStep);
      if (openState) {
        smoothScroll(el as Element, { block: 'center' });
      }
      this.setStore({
        ...store,
        progress,
        triggerRef: el,
        openState,
      });
      if (isComplete) {
        this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
      }
    });
    this.watcher.once('element-found-timeout', async () => {
      await this.reportTooltipTargetMissingEvent(currentStep);
      await this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
    });
    this.watcher.findElement();
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

    // Set up modal state
    const openState = !this.isTemporarilyHidden();
    this.setStore({ ...store, openState, progress });

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
    for (const action of actions) {
      if (action.type === ContentActionsItemType.STEP_GOTO) {
        await this.goto(action.data.stepCvid);
      } else if (action.type === ContentActionsItemType.FLOW_START) {
        await this.startNewTour(action.data.contentId);
      } else if (action.type === ContentActionsItemType.FLOW_DISMIS) {
        await this.handleClose(contentEndReason.USER_CLOSED);
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      } else if (action.type === ContentActionsItemType.PAGE_NAVIGATE) {
        this.handleNavigate(action.data);
      }
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

  async checkStepVisible() {
    const { triggerRef, currentStep, openState } = this.getStore().getSnapshot();
    if (!this.getCurrentStep() || !currentStep) {
      return;
    }

    if (this.isTemporarilyHidden()) {
      if (openState) {
        this.hide();
      }
      return;
    }

    if (currentStep.type === StepContentType.MODAL) {
      if (!openState) {
        this.open();
      }
      return;
    }

    if (
      !triggerRef ||
      !this.watcher ||
      !currentStep?.cvid ||
      currentStep.type !== StepContentType.TOOLTIP
    ) {
      return;
    }

    const { isHidden, isTimeout } = await this.watcher.checkVisibility();

    if (!isHidden) {
      if (!openState) {
        this.open();
      }
      return;
    }

    if (isTimeout) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
    } else {
      this.hide();
    }
  }

  async activeTriggerConditions() {
    const currentStep = this.getCurrentStep();
    if (!currentStep?.trigger?.length) {
      return;
    }

    const remainingTriggers = [];

    for (const trigger of currentStep.trigger) {
      const { conditions, ...rest } = trigger;
      const activatedConditions = await activedRulesConditions(conditions);

      if (!isActive(activatedConditions)) {
        remainingTriggers.push({
          ...rest,
          conditions: activatedConditions,
        });
      } else {
        // Execute actions immediately when conditions are met
        await this.handleActions(trigger.actions);
      }
    }

    const newCurrentStep = this.getCurrentStep();
    if (!newCurrentStep || currentStep.cvid !== newCurrentStep.cvid) {
      return;
    }
    this.setCurrentStep({
      ...newCurrentStep,
      trigger: remainingTriggers,
    });
  }

  isActiveTour() {
    return this.getActiveTour() === this;
  }

  isShow() {
    const { openState } = this.getStore().getSnapshot();
    return this.isActiveTour() && this.getCurrentStep() && openState;
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
