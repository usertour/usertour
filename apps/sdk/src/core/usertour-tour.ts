import { smoothScroll } from '@usertour-packages/dom';
import {
  ContentEditorClickableElement,
  ContentEditorQuestionElement,
  isQuestionElement,
} from '@usertour-packages/shared-editor';
import {
  AttributeBizTypes,
  RulesCondition,
  StepContentType,
  contentEndReason,
} from '@usertour/types';
import { isUndefined } from '@usertour/helpers';
import { TourStore, BaseStore } from '@/types/store';
import { UsertourElementWatcher } from '@/core/usertour-element-watcher';
import { UsertourComponent } from '@/core/usertour-component';
import { UsertourTrigger } from '@/core/usertour-trigger';
import { logger } from '@/utils';
import { createQuestionAnswerEventData } from '@/core/usertour-helper';
import { SDKClientEvents, WidgetZIndex } from '@usertour-packages/constants';
import { SessionStep, SessionTheme } from '@/types';
import { CommonActionHandler, TourActionHandler } from '@/core/action-handlers';

export class UsertourTour extends UsertourComponent<TourStore> {
  // === Properties ===
  private watcher: UsertourElementWatcher | null = null;
  private stepTrigger: UsertourTrigger | null = null;
  private currentStepCvid?: string;

  // === Abstract Methods Implementation ===
  /**
   * Initialize action handlers for tour
   */
  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler(), new TourActionHandler()]);
  }

  /**
   * Creates an action handler context with tour-specific methods
   * @returns ActionHandlerContext object with mapped methods including tour-specific ones
   */
  protected createActionHandlerContext() {
    const baseContext = super.createActionHandlerContext();
    return {
      ...baseContext,
      showStepByCvid: (stepCvid: string) => this.showStepByCvid(stepCvid),
      handleDismiss: (reason?: contentEndReason) => this.handleDismiss(reason),
    };
  }

  /**
   * Checks the tour
   */
  async check(): Promise<void> {
    try {
      // Check if the target element of the current step is visible
      await this.checkTargetVisibility();
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

  // === Public API Methods ===
  /**
   * Shows a specific step in the tour by its id
   * @param id - The id of the step to show
   * @returns Promise that resolves when the step is shown
   */
  async showStepById(id: string): Promise<void> {
    const step = this.getStepById(id);
    if (!step) {
      return;
    }
    return await this.show(step);
  }

  /**
   * Shows a specific step in the tour by its cvid
   * @param cvid - The cvid of the step to show
   * @returns Promise that resolves when the step is shown
   */
  async showStepByCvid(cvid: string): Promise<void> {
    const step = this.getStepByCvid(cvid);
    if (!step) {
      return;
    }
    return await this.show(step);
  }

  /**
   * Shows a specific step in the tour by its index
   * @param index - The index of the step to show
   * @returns Promise that resolves when the step is shown
   */
  async showStepByIndex(index: number): Promise<void> {
    const steps = this.getSteps();
    if (!steps.length || index < 0 || index >= steps.length) {
      return;
    }
    return await this.show(steps[index]);
  }

  /**
   * Handles the dismiss event
   * @param reason - The reason for dismissing the tour, defaults to USER_CLOSED
   */
  async handleDismiss(reason?: contentEndReason) {
    await this.close(reason);
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
        this.updateSessionAttribute(AttributeBizTypes.User, el.data.selectedAttribute, value);
      }
      await this.reportQuestionAnswer(el, value);
    }
    if (element?.data?.actions) {
      await this.handleActions(element.data.actions as RulesCondition[]);
    }
  }

  // === Store Management ===
  /**
   * Gets the z-index for the tour component
   * @protected
   */
  protected getZIndex(): number {
    return this.getBaseZIndex() + WidgetZIndex.TOUR_OFFSET;
  }

  /**
   * Gets custom tour store data
   * @param _baseData - The base store data that can be used for custom logic
   * @protected
   */
  protected getCustomStoreData(_baseData: Partial<BaseStore> | null): Partial<TourStore> {
    const currentStep = this.getCurrentStep();
    return { currentStep };
  }

  // === Theme Management ===
  /**
   * Gets custom theme settings for the tour
   * @protected
   */
  protected getCustomTheme(): SessionTheme | undefined {
    return this.getCurrentStep()?.theme;
  }

  // === Step Management ===
  /**
   * Shows a specific step in the tour by its cvid, or the first step if no cvid is provided
   * @param step - The step to show
   * @private
   */
  private async show(step: SessionStep): Promise<void> {
    // Reset tour state and set new step
    this.reset();
    this.currentStepCvid = step.cvid;
    // Report step seen event
    await this.reportStepSeen(step);
    // Create trigger for this step if it has triggers
    if (step.trigger?.length && step.trigger.length > 0) {
      this.stepTrigger = new UsertourTrigger(
        step.trigger,
        () => this.getSessionAttributes(), // Simple function that gets fresh attributes
        (actions) => this.handleActions(actions),
      );
      await this.stepTrigger.process();
    }

    // Show step based on its type
    await this.showStep(step);
  }

  /**
   * Gets the current step by cvid
   * @private
   */
  private getCurrentStep(): SessionStep | undefined {
    if (!this.currentStepCvid) return undefined;
    return this.getStepByCvid(this.currentStepCvid);
  }

  /**
   * Shows a step based on its type
   * @private
   */
  private async showStep(step: SessionStep): Promise<void> {
    if (step.cvid !== this.currentStepCvid) {
      return;
    }
    if (step.type === StepContentType.TOOLTIP) {
      await this.showPopper(step);
    }
    if (step.type === StepContentType.MODAL) {
      await this.showModal(step);
    }
  }

  /**
   * Get the current step info for store data
   * @param step - The step
   * @returns Store data with step info
   * @private
   */
  private getStepInfo(step: SessionStep) {
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
    const index = steps.findIndex((s) => s.cvid === step.cvid);
    const validIndex = index === -1 ? 0 : index;
    const progress = Math.round(((validIndex + 1) / total) * 100);

    return {
      totalSteps: total,
      currentStepIndex: validIndex,
      progress,
    };
  }

  // === Step Display Methods ===
  /**
   * Displays a tooltip step in the tour
   * This method handles:
   * 1. Validating the step and its target
   * 2. Setting up the element watcher
   * 3. Handling element found and timeout events
   * 4. Updating the store with the new state
   *
   * @param step - The step to display as a tooltip
   * @throws Will close the tour if validation fails or target is missing
   * @private
   */
  private async showPopper(step: SessionStep): Promise<void> {
    // Set up element watcher
    const baseStoreData = await this.buildStoreData();
    if (!baseStoreData) {
      logger.error('Store not found', { step });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    this.setupElementWatcher(step, { ...baseStoreData, triggerRef: null });
  }

  /**
   * Display a modal step in the tour
   * This method handles:
   * 1. Building the store data
   * 2. Reporting step seen event
   * 3. Setting up the modal state
   * 4. Reporting completion event if it's the last step
   *
   * @param step - The step to be displayed as a modal
   * @private
   */
  private async showModal(step: SessionStep): Promise<void> {
    // Build store data and get step information
    const baseStoreData = await this.buildStoreData();
    if (!baseStoreData) {
      logger.error('Store not found', { step });
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }
    const stepInfo = this.getStepInfo(step);
    // Set up modal state
    this.setStoreData({
      ...baseStoreData,
      ...stepInfo,
      openState: true,
    });
  }

  // === Element Watcher ===
  /**
   * Sets up the element watcher for a popper step
   * @private
   */
  private setupElementWatcher(step: SessionStep, store: TourStore): void {
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
    this.watcher.once(SDKClientEvents.ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, step, store);
      }
    });

    // Handle element not found
    this.watcher.once(SDKClientEvents.ELEMENT_FOUND_TIMEOUT, async () => {
      await this.handleElementNotFound(step);
    });

    // Handle element changed
    this.watcher.on(SDKClientEvents.ELEMENT_CHANGED, (el) => {
      if (el instanceof Element) {
        this.handleElementChanged(el, step);
      }
    });
    // Start watching
    this.watcher.findElement();
  }

  /**
   * Handles when the target element is found
   * @private
   */
  private handleElementFound(el: Element, step: SessionStep, store: TourStore): void {
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    const stepInfo = this.getStepInfo(step);

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

  /**
   * Handles the element changed event
   * @private
   */
  private handleElementChanged(el: Element, step: SessionStep): void {
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    // Update store
    this.updateStore({ triggerRef: el });
  }

  /**
   * Handles when the target element is not found
   * @private
   */
  private async handleElementNotFound(step: SessionStep): Promise<void> {
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    await this.reportTooltipTargetMissing(step);
    await this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
  }

  // === Trigger Management ===
  /**
   * Checks and processes the trigger for the current step
   * @private
   */
  private async checkAndProcessTrigger(): Promise<void> {
    if (this.stepTrigger) {
      await this.stepTrigger.process();
    }
  }

  /**
   * Resets the step trigger
   * @private
   */
  private resetStepTrigger() {
    this.stepTrigger?.destroy();
    this.stepTrigger = null;
  }

  // === Visibility Checking ===
  /**
   * Checks and updates the visibility of the target element
   * @private
   */
  private async checkTargetVisibility(): Promise<void> {
    const store = this.getStoreData();
    if (!store) {
      return;
    }

    const { triggerRef, currentStep, openState } = store;
    const isTooltipStep = currentStep?.type === StepContentType.TOOLTIP;
    const hasRequiredData = triggerRef && this.watcher && currentStep?.cvid;

    if (!isTooltipStep || !hasRequiredData || !this.watcher) {
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
      await this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
      return;
    }

    this.hide();
  }

  // === Event Reporting ===
  /**
   * Reports step seen event
   * @param step - The step to report
   * @private
   */
  private async reportStepSeen(step: SessionStep) {
    await this.socketService.goToStep({
      sessionId: this.getSessionId(),
      stepId: String(step.id),
    });
  }

  /**
   * Reports the tooltip target missing event
   * @param step - The step where target is missing
   * @private
   */
  private async reportTooltipTargetMissing(step: SessionStep) {
    await this.socketService.reportTooltipTargetMissing(
      {
        sessionId: this.getSessionId(),
        stepId: String(step.id),
      },
      { batch: true },
    );
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
   * @private
   */
  private async reportQuestionAnswer(element: ContentEditorQuestionElement, value?: any) {
    const eventData = createQuestionAnswerEventData(element, value, this.getSessionId());
    await this.socketService.answerQuestion(eventData);
  }

  // === Lifecycle Hooks ===
  /**
   * Tour-specific cleanup logic
   * @protected
   */
  protected onDestroy(): void {
    // Reset the step trigger
    this.resetStepTrigger();
    // Destroy the element watcher
    this.watcher?.destroy();
  }

  /**
   * Tour-specific reset logic
   * @protected
   */
  protected onReset(): void {
    this.currentStepCvid = undefined;
    this.resetStepTrigger();
    this.watcher = null;
  }
}
