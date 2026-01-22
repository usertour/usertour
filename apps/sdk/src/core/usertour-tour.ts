import { smoothScroll } from '@usertour-packages/dom';
import {
  AttributeBizTypes,
  ContentEditorClickableElement,
  ContentEditorQuestionElement,
  MissingTooltipTargetBehavior,
  RulesCondition,
  StepContentType,
  contentEndReason,
  SessionStep,
  SessionTheme,
} from '@usertour/types';
import { isQuestionElement } from '@usertour/helpers';
import { TourStore, BaseStore } from '@/types/store';
import { UsertourElementWatcher } from '@/core/usertour-element-watcher';
import {
  UsertourComponent,
  BuildStoreOptions,
  CustomStoreDataContext,
} from '@/core/usertour-component';
import { UsertourTrigger } from '@/core/usertour-trigger';
import { logger } from '@/utils';
import { createQuestionAnswerEventData } from '@/core/usertour-helper';
import { SDKClientEvents, WidgetZIndex } from '@usertour-packages/constants';
import { CommonActionHandler, TourActionHandler, ActionSource } from '@/core/action-handlers';
import { UsertourTheme } from './usertour-theme';

/**
 * Tour-specific options for buildStoreData
 */
type TourBuildOptions = BuildStoreOptions & {
  stepOverride?: SessionStep;
};

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
   * @param source - The source of the action (button or trigger)
   * @returns ActionHandlerContext object with mapped methods including tour-specific ones
   */
  protected createActionHandlerContext(source: ActionSource) {
    const baseContext = super.createActionHandlerContext(source);
    return {
      ...baseContext,
      showStepByCvid: (stepCvid: string) => this.showStepByCvid(stepCvid),
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
   * @param reportStepSeen - Whether to report the step seen event
   * @returns Promise that resolves when the step is shown
   */
  async showStepById(id: string, reportStepSeen = true): Promise<void> {
    const step = this.getStepById(id);
    if (!step) {
      return;
    }
    return await this.show(step, reportStepSeen);
  }

  /**
   * Shows a specific step in the tour by its cvid
   * @param cvid - The cvid of the step to show
   * @param reportStepSeen - Whether to report the step seen event
   * @returns Promise that resolves when the step is shown
   */
  async showStepByCvid(cvid: string, reportStepSeen = true): Promise<void> {
    const step = this.getStepByCvid(cvid);
    if (!step) {
      return;
    }
    return await this.show(step, reportStepSeen);
  }

  /**
   * Shows a specific step in the tour by its index
   * @param index - The index of the step to show
   * @param reportStepSeen - Whether to report the step seen event
   * @returns Promise that resolves when the step is shown
   */
  async showStepByIndex(index: number, reportStepSeen = true): Promise<void> {
    const steps = this.getSteps();
    if (!steps.length || index < 0 || index >= steps.length) {
      return;
    }
    return await this.show(steps[index], reportStepSeen);
  }

  /**
   * Handles the dismiss event from UI (X button, backdrop click)
   * @param reason - The reason for dismissing the tour, defaults to CLOSE_BUTTON_DISMISS
   */
  async handleDismiss(reason: contentEndReason = contentEndReason.CLOSE_BUTTON_DISMISS) {
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

  /**
   * Handles actions triggered by StepTrigger
   * Uses TRIGGER_DISMISS reason for dismiss actions instead of ACTION_DISMISS
   * @param actions - The actions to handle
   */
  private async handleTriggerActions(actions: RulesCondition[]): Promise<void> {
    await this.handleActions(actions, ActionSource.TRIGGER);
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
   * @param context - Context containing baseData and optional options with stepOverride
   * @protected
   */
  protected getCustomStoreData(
    context: CustomStoreDataContext<TourBuildOptions>,
  ): Partial<TourStore> {
    const { baseData, options } = context;
    const currentStep = options?.stepOverride ?? this.getCurrentStep();

    return {
      currentStep,
      ...this.getStepStyle(currentStep, baseData),
    };
  }

  /**
   * Gets style data for a specific step
   * @param step - The current step
   * @param baseData - The base store data that contains theme information
   * @private
   */
  private getStepStyle(
    step: SessionStep | undefined,
    baseData: Partial<BaseStore> | null,
  ): Partial<Pick<TourStore, 'globalStyle'>> {
    const themeSettings = baseData?.themeSettings;

    if (!step || step.type === StepContentType.HIDDEN || !themeSettings) {
      return {};
    }

    if (step.type === StepContentType.TOOLTIP && baseData?.globalStyle) {
      return { globalStyle: baseData.globalStyle };
    }

    return {
      globalStyle: UsertourTheme.convertToCssVars(themeSettings, step.type),
    };
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
  private async show(step: SessionStep, reportStepSeen = true): Promise<void> {
    // Early return if the step is already open
    if (this.isOpen() && step.cvid === this.currentStepCvid) {
      return;
    }
    // Reset tour state and set new step
    this.reset();
    this.currentStepCvid = step.cvid;
    // Report step seen event
    if (reportStepSeen) {
      await this.reportStepSeen(step);
    }
    // Create trigger for this step if it has triggers
    if (step.trigger?.length && step.trigger.length > 0) {
      this.stepTrigger = new UsertourTrigger(
        this.getContentId(),
        step.trigger,
        () => this.getSessionAttributes(), // Simple function that gets fresh attributes
        (actions) => this.handleTriggerActions(actions),
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
    if (step.type === StepContentType.BUBBLE) {
      await this.showBubble(step);
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
    const storeData = await this.buildStoreData();
    if (!storeData) {
      logger.error('Store not found', { step });
      await this.close(contentEndReason.STORE_NOT_FOUND);
      return;
    }
    this.setupElementWatcher(step, { ...storeData, triggerRef: null });
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
    const storeData = await this.buildStoreData();
    if (!storeData) {
      logger.error('Store not found', { step });
      await this.close(contentEndReason.STORE_NOT_FOUND);
      return;
    }
    const stepInfo = this.getStepInfo(step);
    // Set up modal state
    this.setStoreData({
      ...storeData,
      ...stepInfo,
      openState: true,
    });
  }

  /**
   * Display a bubble step in the tour
   * @param step - The step to be displayed as a bubble
   * @param useStepOverride - Whether to use the step as override (for fallback scenarios)
   * @private
   */
  private async showBubble(step: SessionStep, useStepOverride = false): Promise<void> {
    // Only use stepOverride when explicitly requested (e.g., tooltip -> bubble fallback)
    const options = useStepOverride ? { stepOverride: step } : undefined;
    const storeData = await this.buildStoreData(options);
    if (!storeData) {
      logger.error('Store not found', { step });
      await this.close(contentEndReason.STORE_NOT_FOUND);
      return;
    }
    const stepInfo = this.getStepInfo(step);

    // Set up bubble state
    this.setStoreData({
      ...storeData,
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

    // Priority: API setting > Theme setting > Default (6 seconds)
    const DEFAULT_TARGET_MISSING_SECONDS = 6;
    const targetMissingSeconds =
      this.instance.getTargetMissingSeconds() ??
      store.themeSettings?.tooltip?.missingTargetTolerance ??
      DEFAULT_TARGET_MISSING_SECONDS;
    this.watcher.setTargetMissingSeconds(targetMissingSeconds);

    // Handle element found
    this.watcher.once(SDKClientEvents.ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, step, store);
      }
    });

    // Handle element not found (fire-and-forget since event system doesn't await)
    this.watcher.once(SDKClientEvents.ELEMENT_FOUND_TIMEOUT, () => {
      this.handleElementNotFound(step, store);
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
  private async handleElementNotFound(step: SessionStep, store: TourStore): Promise<void> {
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }

    const behavior = store.themeSettings?.tooltip?.missingTargetBehavior;

    if (behavior === MissingTooltipTargetBehavior.USE_BUBBLE) {
      // Convert tooltip to bubble, use stepOverride to ensure correct styles
      await this.showBubble({ ...step, type: StepContentType.BUBBLE }, true);
      return;
    }

    // Default: AUTO_DISMISS
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
    const storeData = this.getStoreData();
    if (!storeData) {
      return;
    }

    const { triggerRef, currentStep, openState } = storeData;
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
