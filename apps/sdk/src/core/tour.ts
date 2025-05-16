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
  contentStartReason,
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

  show(cvid?: string) {
    const content = this.getContent();
    if (!content.steps || !content.steps.length) {
      return;
    }
    const stepToShow = content.steps.find((step) => step.cvid === cvid) || content.steps[0];
    if (stepToShow?.cvid) {
      this.goto(stepToShow.cvid);
    } else {
      this.close();
    }
  }

  refresh() {
    const content = this.getContent();
    const newStep = content.steps?.find((step) => step.cvid === this.getCurrentStep()?.cvid);
    const currentStep = this.getCurrentStep();
    if (!newStep || !currentStep) {
      return;
    }
    const { trigger, ...rest } = newStep;

    const step = {
      ...rest,
      trigger: trigger?.filter((t) => currentStep.trigger?.find((tt) => tt.id === t.id)),
    };

    this.setCurrentStep(step);

    const { openState, triggerRef, progress, ...storeData } = this.buildStoreData();

    //todo replace element watcher target
    this.updateStore({ ...storeData, currentStep: step });
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

  async goto(stepCvid: string) {
    const userInfo = this.getUserInfo();
    const content = this.getContent();
    if (!content.steps || !userInfo || !userInfo.externalId) {
      await this.close();
      return;
    }
    const total = content.steps.length;
    const currentStep = content.steps.find((step) => step.cvid === stepCvid);
    if (!currentStep) {
      this.handleClose(contentEndReason.USER_CLOSED);
      return;
    }
    this.reset();
    const index = content.steps.findIndex((step) => step.cvid === currentStep.cvid);
    const isComplete = index + 1 === total;
    const progress = ((index + 1) / total) * 100;
    this.setCurrentStep(currentStep);
    const storeData = this.buildStoreData();
    const data = {
      ...storeData,
      progress,
    };

    if (currentStep.type === 'tooltip') {
      await this.showPopper(data);
    } else {
      await this.showModal(data);
    }
    await this.reportStepEvents(currentStep, index, progress, isComplete);
  }

  async showPopper(tourStore: TourStore) {
    const currentStep = this.getCurrentStep();
    if (!currentStep?.target || currentStep.cvid !== this.getCurrentStep()?.cvid || !document) {
      await this.close();
      return;
    }
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
    this.watcher = new ElementWatcher(currentStep.target);
    this.watcher.once('element-found', (el) => {
      const openState = !this.isTemporarilyHidden();
      if (openState) {
        smoothScroll(el as Element, { block: 'center' });
      }
      this.setStore({
        ...tourStore,
        triggerRef: el,
        openState,
      });
    });
    this.watcher.once('element-found-timeout', () => {
      this.handleClose(contentEndReason.ELEMENT_NOT_FOUND);
    });
    this.watcher.findElement();
  }

  async showModal(tourStore: TourStore) {
    const openState = !this.isTemporarilyHidden();
    this.setStore({ ...tourStore, openState });
  }

  async close(reason: contentEndReason = contentEndReason.USER_CLOSED) {
    const userInfo = this.getUserInfo();
    const content = this.getContent();
    if (!content?.steps || !this.getCurrentStep() || !userInfo?.externalId) {
      this.destroy();
      return;
    }
    await this.reportCloseEvent(reason);
    this.setDismissed(true);
    this.destroy();
  }

  async handleClose(reason?: contentEndReason) {
    await this.close(reason);
    await this.startTour(undefined, contentStartReason.START_CONDITION);
  }

  async handleActions(actions: RulesCondition[]) {
    // Separate PAGE_NAVIGATE actions from other actions
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
        await this.handleClose();
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      }
    }

    // Execute PAGE_NAVIGATE actions last
    for (const action of pageNavigateActions) {
      this.handleNavigate(action.data);
    }
  }

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
      await this.close();
      await this.startTour(undefined, contentStartReason.START_CONDITION);
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
    const content = this.getContent();
    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return;
    }
    const total = content.steps?.length ?? 0;
    const index = content.steps?.findIndex((step) => step.cvid === currentStep.cvid) ?? 0;
    const progress = Math.round(((index + 1) / total) * 100);

    await this.reportEventWithSession(
      {
        eventName: BizEvents.FLOW_ENDED,
        eventData: {
          flow_end_reason: reason,
          flow_step_number: index,
          flow_step_cvid: currentStep.cvid,
          flow_step_name: currentStep.name,
          flow_step_progress: progress,
        },
      },
      { isDeleteSession: true },
    );
  }

  /**
   * Reports the step events
   * @param currentStep - The current step
   * @param index - The index of the current step
   * @param progress - The progress of the current step
   * @param isComplete - Whether the current step is complete
   */
  private async reportStepEvents(
    currentStep: Step,
    index: number,
    progress: number,
    isComplete: boolean,
  ) {
    const eventData = {
      flow_step_number: index,
      flow_step_cvid: currentStep.cvid,
      flow_step_name: currentStep.name,
      flow_step_progress: Math.round(progress),
    };

    await this.reportEventWithSession({
      eventData,
      eventName: BizEvents.FLOW_STEP_SEEN,
    });

    if (isComplete) {
      await this.reportEventWithSession(
        {
          eventData,
          eventName: BizEvents.FLOW_COMPLETED,
        },
        { isDeleteSession: true },
      );
    }
  }
}
