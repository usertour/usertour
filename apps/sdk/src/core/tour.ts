import {
  BizEvents,
  ContentActionsItemType,
  flowEndReason,
  RulesCondition,
  SDKContent,
  Step,
  StepContentType,
} from "@usertour-ui/types";
import { type App } from "./app";
import { smoothScroll } from "@usertour-ui/dom";
import { ContentEditorButtonElement } from "@usertour-ui/shared-editor";
import { evalCode } from "@usertour-ui/ui-utils";
import { document } from "../utils/globals";
import { isActive } from "../utils/conditions";
import { defaultTourStore } from "./common";
import { ElementWatcher } from "./element-watcher";
import { BaseContent } from "./base-content";
import { TourStore } from "../types/store";
import { AppEvents } from "../utils/event";

export class Tour extends BaseContent<TourStore> {
  private watcher: ElementWatcher | null = null;

  constructor(instance: App, content: SDKContent) {
    super(instance, content, defaultTourStore);
  }

  async monitor() {
    if (this.isActiveTour()) {
      this.checkStepVisible();
      this.triggerCurrentStepActions();
    }
    await this.activeContentConditions();
  }

  show() {
    const content = this.getContent();
    if (!content.steps || !content.steps.length) {
      return;
    }
    const step = content.steps[0];
    const cvid = step.cvid;
    if (cvid) {
      this.goto(cvid);
    }
  }

  async cancel() {
    if (this.isActiveTour()) {
      this.cancelActiveTour();
    }
  }

  refresh() {
    const content = this.getContent();
    const newStep = content.steps?.find(
      (step) => step.cvid == this.getCurrentStep()?.cvid
    );
    const currentStep = newStep || this.getCurrentStep() || undefined;
    this.setCurrentStep(currentStep || null);

    const { openState, triggerRef, progress, ...storeData } =
      this.buildStoreData();

    //todo replace element watcher target
    this.updateStore({ ...storeData, currentStep });
  }

  getReusedSessionId() {
    return null;
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
      await this.cancelActiveTour();
      return;
    }
    const total = content.steps.length;
    const currentStep = content.steps.find((step) => step.cvid == stepCvid);
    if (!currentStep) {
      this.handleClose(flowEndReason.USER_CLOSED);
      return;
    }
    this.reset();
    const index = content.steps.findIndex(
      (step) => step.cvid == currentStep.cvid
    );
    const isComplete = index + 1 == total ? true : false;
    const progress = ((index + 1) / total) * 100;
    this.setCurrentStep(currentStep);
    const storeData = this.buildStoreData();
    const data = {
      ...storeData,
      progress,
    };

    if (currentStep.type == "tooltip") {
      await this.showPopper(data);
    } else {
      await this.showModal(data);
    }
    await this.reportStepEvents(currentStep, index, progress, isComplete);
  }

  async showPopper(tourStore: TourStore) {
    const currentStep = this.getCurrentStep();
    if (
      !currentStep?.target ||
      currentStep.cvid != this.getCurrentStep()?.cvid ||
      !document
    ) {
      await this.cancelActiveTour();
      return;
    }
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
    this.watcher = new ElementWatcher(currentStep.target);
    this.watcher.once("element-found", (el) => {
      const openState = this.isTemporarilyHidden() ? false : true;
      if (openState) {
        smoothScroll(el as Element, { block: "center" });
      }
      this.setStore({
        ...tourStore,
        triggerRef: el,
        openState,
      });
    });
    this.watcher.once("element-found-timeout", () => {
      this.handleClose(flowEndReason.ELEMENT_NOT_FOUND);
    });
    this.watcher.findElement();
  }

  async showModal(tourStore: TourStore) {
    const openState = this.isTemporarilyHidden() ? false : true;
    this.setStore({ ...tourStore, openState });
  }

  async close(reason: flowEndReason = flowEndReason.USER_CLOSED) {
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

  async handleClose(reason?: flowEndReason) {
    await this.closeActiveTour(reason);
    await this.startTour(undefined, "start_condition");
  }

  async handleActions(actions: RulesCondition[]) {
    actions.forEach(async (action) => {
      if (action.type == ContentActionsItemType.STEP_GOTO) {
        await this.goto(action.data.stepCvid);
      } else if (action.type == ContentActionsItemType.FLOW_START) {
        await this.startNewTour(action.data.contentId);
      } else if (action.type == ContentActionsItemType.FLOW_DISMIS) {
        await this.handleClose();
      } else if (action.type == ContentActionsItemType.PAGE_NAVIGATE) {
        this.handleNavigate(action.data);
      } else if (action.type == ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      }
    });
  }

  async handleOnClick({ type, data }: ContentEditorButtonElement) {
    if (type == "button" && data.actions) {
      await this.handleActions(data.actions);
    }
  }

  async checkStepVisible() {
    const { triggerRef, currentStep, openState } =
      this.getStore().getSnapshot();
    if (!this.getCurrentStep() || !currentStep) {
      return;
    }

    if (this.isTemporarilyHidden()) {
      if (openState) {
        this.hide();
      }
      return;
    }

    if (currentStep.type == StepContentType.MODAL) {
      if (!openState) {
        this.open();
      }
      return;
    }

    if (
      !triggerRef ||
      !this.watcher ||
      !currentStep?.cvid ||
      currentStep.type != StepContentType.TOOLTIP
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
      await this.closeActiveTour();
      await this.startTour(undefined, "start_condition");
    } else {
      this.hide();
    }
  }

  async triggerCurrentStepActions() {
    const currentStep = this.getCurrentStep();
    if (
      !currentStep ||
      !currentStep?.trigger ||
      currentStep?.trigger.length == 0
    ) {
      return;
    }
    for (let index = 0; index < currentStep.trigger.length; index++) {
      const { actions, conditions } = currentStep.trigger[index];
      if (isActive(conditions)) {
        await this.handleActions(actions);
        currentStep.trigger.splice(index, 1);
      }
    }
  }

  isActiveTour() {
    return this.getActiveTour() == this;
  }

  isShow() {
    const { openState } = this.getStore().getSnapshot();
    return this.isActiveTour() && this.getCurrentStep() && openState;
  }

  reset() {
    this.setCurrentStep(null);
    this.setStore(defaultTourStore);
  }

  destroy() {
    this.reset();
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
  }

  initializeEventListeners() {
    this.once(AppEvents.CONTENT_AUTO_START_ACTIVATED, async (args: any) => {
      await this.reportAutoStartEvent(args.reason);
    });
  }

  async reportAutoStartEvent(reason?: string) {
    await this.reportEventWithSession(
      {
        eventName: BizEvents.FLOW_STARTED,
        eventData: {
          flow_start_reason: reason ?? "auto_start",
        },
      },
      { isCreateSession: true }
    );
  }

  private async reportCloseEvent(reason: flowEndReason) {
    const content = this.getContent();
    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return;
    }
    const total = content.steps?.length ?? 0;
    const index =
      content.steps?.findIndex((step) => step.cvid == currentStep.cvid) ?? 0;
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
      { isDeleteSession: true }
    );
  }

  private async reportStepEvents(
    currentStep: Step,
    index: number,
    progress: number,
    isComplete: boolean
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
        { isDeleteSession: true }
      );
    }
  }
}
