import {
  ContentEditorClickableElement,
  ContentEditorQuestionElement,
  ContentEditorRoot,
  CustomContentSession,
  RulesCondition,
  SessionStep,
  SessionTheme,
  StepContentType,
  StepGotoDirection,
  contentEndReason,
  contentStartReason,
} from '@usertour/types';
import { isEqual, isQuestionElement } from '@usertour/helpers';
import { isVisibleNode } from '@usertour/dom';
import { SDKClientEvents } from '@usertour/constants';

import { EmbedStore } from '@/types/store';
import { UsertourComponent, CustomStoreDataContext } from '@/core/usertour-component';
import { UsertourElementWatcher } from '@/core/usertour-element-watcher';
import { UsertourTrigger } from '@/core/usertour-trigger';
import { UsertourTheme } from '@/core/usertour-theme';
import { rootsHaveButtonConditions } from '@/core/usertour-helper';
import { ActionSource, CommonActionHandler, EmbedActionHandler } from '@/core/action-handlers';
import { logger } from '@/utils';

const log = logger.scope('embed');

// An embed keeps watching for its target for as long as the session lives (same
// as launchers and element-attached banners): in an SPA the target may only
// render after a client-side navigation, long past a short one-shot timeout.
const EMBED_TARGET_MISSING_SECONDS = 3600;

/**
 * An embed: editor content rendered inline at a target element, one of
 * several that may show at once. Its steps are flow steps (INLINE / HIDDEN)
 * paged inside one shell, so the step machinery is the tour's; its mounting is
 * the element-attached banner's (ADR 0022).
 *
 * Two deliberate differences from the tour: a step change updates the store
 * in place (a reset would unmount the shell and shift the host layout between
 * steps), and the target watcher lives for the whole session rather than per
 * step.
 */
export class UsertourEmbed extends UsertourComponent<EmbedStore> {
  private watcher: UsertourElementWatcher | null = null;
  // Serialized target the live watcher was built for (idempotency key).
  private watcherTargetKey: string | null = null;
  /** See usertour-launcher.ts: the found handler must render the LATEST store. */
  private pendingWatcherStore: EmbedStore | null = null;
  private stepTrigger: UsertourTrigger | null = null;
  private currentStepCvid?: string;
  /** Whether the target is found and visible — one of the two gates on openState. */
  private targetVisible = false;

  protected initializeActionHandlers(): void {
    this.registerActionHandlers([new CommonActionHandler(), new EmbedActionHandler()]);
  }

  protected createActionHandlerContext(source: ActionSource) {
    const baseContext = super.createActionHandlerContext(source);
    return {
      ...baseContext,
      showStepByCvid: (stepCvid: string) => this.showStepByCvid(stepCvid),
      showRelativeStep: (direction: StepGotoDirection) => this.showRelativeStep(direction),
    };
  }

  async check(): Promise<void> {
    try {
      await this.checkTargetVisibility();
      await this.checkAndProcessTrigger();
      await this.checkAndUpdateButtonConditions();
      await this.checkAndUpdateThemeSettings();
    } catch (error) {
      log.error('Failed to check the embed state', error);
    }
  }

  // === Public API ===
  /**
   * Shows the embed: picks the step to open on (the session's remembered
   * step, else the first), then attaches to the target. The store is written
   * once the target is found; a sessionless pre-activation starts the content
   * instead and waits for the server to hand back the session.
   */
  async show(): Promise<void> {
    this.ensureCurrentStep();
    const storeData = await this.buildStoreData();
    if (!storeData?.embedData) {
      return;
    }
    this.setupElementWatcher(storeData);
  }

  /**
   * Updates the embed with new session data (a server re-send, a locale
   * change, the session handed back after a pre-activation start).
   * @param session - The new session data
   */
  async update(session: CustomContentSession): Promise<void> {
    this.updateSession(session);
    this.ensureCurrentStep();
    if (!this.hasStoreData()) {
      await this.show();
      return;
    }
    await this.refreshStoreData();
    const store = this.getStoreData();
    if (!store?.embedData) {
      return;
    }
    this.setupElementWatcher(store);
  }

  /**
   * Shows a step by its id (the server's ForceGoToStep)
   * @param id - The step id
   * @param reportStepSeen - Whether to report the step seen event
   */
  async showStepById(id: string, reportStepSeen = true): Promise<void> {
    const step = this.getStepById(id);
    if (!step) {
      return;
    }
    await this.showStep(step, reportStepSeen);
  }

  /**
   * Shows a step by its cvid (a step-goto action)
   * @param cvid - The step cvid
   * @param reportStepSeen - Whether to report the step seen event
   */
  async showStepByCvid(cvid: string, reportStepSeen = true): Promise<void> {
    const step = this.getStepByCvid(cvid);
    if (!step) {
      return;
    }
    await this.showStep(step, reportStepSeen);
  }

  /**
   * Shows the step before or after the current one; a no-op at either end.
   * @param direction - previous or next
   */
  async showRelativeStep(direction: StepGotoDirection): Promise<void> {
    const steps = this.getSteps();
    const currentIndex = steps.findIndex((step) => step.cvid === this.currentStepCvid);
    if (currentIndex === -1) {
      return;
    }
    const targetIndex = direction === StepGotoDirection.NEXT ? currentIndex + 1 : currentIndex - 1;
    const target = steps[targetIndex];
    if (!target) {
      return;
    }
    await this.showStep(target, true);
  }

  async handleDismiss(): Promise<void> {
    await this.close(contentEndReason.DISMISS_BUTTON);
  }

  /**
   * Handles a click on a block: a question answer is recorded and may bind an
   * attribute; a button press is recorded against its step; then the
   * block's actions run.
   * @param element - The element that was clicked
   * @param value - The value of a question element
   */
  async handleOnClick(element: ContentEditorClickableElement, value?: unknown): Promise<void> {
    if (isQuestionElement(element)) {
      await this.handleQuestionAnswer(element as ContentEditorQuestionElement, value);
    } else if (element.type === 'button') {
      this.reportButtonClick(element, this.getCurrentStep()?.id);
    }
    if (element?.data?.actions) {
      await this.handleActions(element.data.actions as RulesCondition[], ActionSource.BUTTON);
    }
  }

  // === Store ===
  protected getZIndex(): number {
    const embedData = this.getEmbedData();
    if (embedData?.zIndex != null) {
      return embedData.zIndex;
    }
    return this.getBaseZIndex();
  }

  protected async getCustomStoreData(
    context: CustomStoreDataContext,
  ): Promise<Partial<EmbedStore>> {
    const { baseData } = context;
    const currentStep = this.getCurrentStep();
    const evaluatedData = currentStep?.data
      ? await this.evaluateButtonConditionsInData(currentStep.data as ContentEditorRoot[])
      : currentStep?.data;
    const evaluatedStep = currentStep ? { ...currentStep, data: evaluatedData } : undefined;
    const themeSettings = baseData?.themeSettings;

    return {
      embedData: this.getEmbedData(),
      currentStep: evaluatedStep as SessionStep | undefined,
      ...this.getStepInfo(currentStep),
      ...(themeSettings
        ? { globalStyle: UsertourTheme.convertToCssVars(themeSettings, 'embed') }
        : {}),
    };
  }

  protected getCustomTheme(): SessionTheme | undefined {
    return this.getCurrentStep()?.theme;
  }

  // === Steps ===
  private getCurrentStep(): SessionStep | undefined {
    if (!this.currentStepCvid) {
      return undefined;
    }
    return this.getStepByCvid(this.currentStepCvid);
  }

  /**
   * Makes sure the current step exists in the (possibly updated) version:
   * the session's remembered step, else the first step.
   */
  private ensureCurrentStep(): void {
    if (this.currentStepCvid && this.getStepByCvid(this.currentStepCvid)) {
      return;
    }
    const remembered = this.session.getCurrentStepFromSession();
    const step =
      (remembered?.cvid ? this.getStepByCvid(remembered.cvid) : undefined) ?? this.getSteps()[0];
    this.currentStepCvid = step?.cvid;
    if (step) {
      this.setupStepTrigger(step);
    }
  }

  private getStepInfo(
    step: SessionStep | undefined,
  ): Pick<EmbedStore, 'currentStepIndex' | 'totalSteps'> {
    const steps = this.getSteps();
    const index = step ? steps.findIndex((candidate) => candidate.cvid === step.cvid) : -1;
    return {
      totalSteps: steps.length,
      currentStepIndex: index === -1 ? 0 : index,
    };
  }

  /** A step is visible when its target is and it is not a hidden step. */
  private computeOpenState(step: SessionStep | undefined): boolean {
    return this.targetVisible && !!step && step.type !== StepContentType.HIDDEN;
  }

  private async showStep(step: SessionStep, reportStepSeen: boolean): Promise<void> {
    if (step.cvid === this.currentStepCvid && this.isOpen()) {
      return;
    }
    this.currentStepCvid = step.cvid;
    if (reportStepSeen) {
      await this.reportStepSeen(step);
    }
    this.setupStepTrigger(step);
    await this.applyCurrentStep();
  }

  /** Re-derives the store for the current step without unmounting the shell. */
  private async applyCurrentStep(): Promise<void> {
    if (!this.hasStoreData()) {
      return;
    }
    const built = await this.buildStoreData();
    if (!built) {
      return;
    }
    const { openState: _openState, targetElement: _targetElement, ...refreshed } = built;
    this.updateStore({
      ...refreshed,
      openState: this.computeOpenState(this.getCurrentStep()),
    } as Partial<EmbedStore>);
  }

  // === Triggers ===
  private setupStepTrigger(step: SessionStep): void {
    this.resetStepTrigger();
    if (!step.trigger?.length) {
      return;
    }
    this.stepTrigger = new UsertourTrigger(
      this.getContentId(),
      step.trigger,
      () => this.getSessionAttributes(),
      (actions) => this.handleActions(actions, ActionSource.TRIGGER),
    );
    void this.stepTrigger.process();
  }

  private async checkAndProcessTrigger(): Promise<void> {
    if (this.stepTrigger) {
      await this.stepTrigger.process();
    }
  }

  private resetStepTrigger(): void {
    this.stepTrigger?.destroy();
    this.stepTrigger = null;
  }

  // === Button conditions ===
  private async checkAndUpdateButtonConditions(): Promise<void> {
    const store = this.getStoreData();
    const currentStep = store?.currentStep;
    const data = currentStep?.data as ContentEditorRoot[] | undefined;
    if (!currentStep || !data || !rootsHaveButtonConditions(data)) {
      return;
    }
    const evaluated = await this.evaluateButtonConditionsInData(data);
    if (isEqual(evaluated, data)) {
      return;
    }
    this.updateStore({
      currentStep: { ...currentStep, data: evaluated },
    } as unknown as Partial<EmbedStore>);
  }

  // === Target ===
  /**
   * Drives the element watcher from the 200ms check loop, so a target that
   * disappears and reappears through SPA navigation is noticed.
   */
  private async checkTargetVisibility(): Promise<void> {
    const store = this.getStoreData();
    if (!store || !this.watcher) {
      return;
    }
    const { isHidden } = await this.watcher.checkVisibility();
    this.targetVisible = !isHidden;
    const desired = this.computeOpenState(this.getCurrentStep());
    if (desired && !store.openState) {
      this.open();
      return;
    }
    if (!desired && store.openState) {
      this.hide();
    }
  }

  private setupElementWatcher(store: EmbedStore): void {
    this.pendingWatcherStore = store;
    const targetElement = store.embedData?.targetElement;
    if (!targetElement) {
      log.warn('Embed has no target element configured; the embed is not shown', {
        data: store.embedData,
      });
      return;
    }

    // Idempotent for an unchanged target — same rationale as the launcher: a
    // server re-send re-runs show()/update(), and tearing down a live watcher
    // wipes its found state mid-flight.
    const targetKey = JSON.stringify(targetElement);
    if (this.watcher && this.watcherTargetKey === targetKey) {
      // once(ELEMENT_FOUND) is already consumed if the element was found; the
      // re-run may be the server handing back the session after a sessionless
      // pre-activation, so complete the found path here.
      const el = this.watcher.getElement();
      if (el && this.getSessionId()) {
        if (el.isConnected) {
          this.targetVisible = isVisibleNode(el);
          this.setStoreData({
            ...store,
            openState: this.computeOpenState(this.getCurrentStep()),
            targetElement: el,
          });
        } else {
          // Detached (SPA re-render): the check loop re-finds by selector and
          // reopens via ELEMENT_CHANGED.
          this.targetVisible = false;
          this.setStoreData({ ...store, openState: false, targetElement: undefined });
        }
      }
      return;
    }

    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
      this.watcherTargetKey = null;
    }

    this.watcherTargetKey = targetKey;
    this.watcher = new UsertourElementWatcher(targetElement);
    this.watcher.setTargetMissingSeconds(EMBED_TARGET_MISSING_SECONDS);

    this.watcher.once(SDKClientEvents.ELEMENT_FOUND, (el) => {
      if (el instanceof Element) {
        this.handleElementFound(el, this.pendingWatcherStore ?? store);
      }
    });

    this.watcher.once(SDKClientEvents.ELEMENT_FOUND_TIMEOUT, () => {
      this.targetVisible = false;
      this.hide();
    });

    this.watcher.on(SDKClientEvents.ELEMENT_CHANGED, (el) => {
      if (el instanceof Element) {
        this.updateStore({ targetElement: el });
      }
    });

    this.watcher.findElement();
  }

  /**
   * The target is on the page. Without a session this is a pre-activation
   * (a full sync delivered the embed before any session existed): start the
   * content so the server records the session and hands it back; nothing is
   * rendered until then, so "seen" means rendered.
   */
  private handleElementFound(el: Element, store: EmbedStore): void {
    this.targetVisible = isVisibleNode(el);
    if (!this.getSessionId()) {
      void this.instance.startContent(
        this.getContentId(),
        contentStartReason.START_FROM_CONDITION,
        undefined,
        false,
      );
      return;
    }
    this.setStoreData({
      ...store,
      openState: this.computeOpenState(this.getCurrentStep()),
      targetElement: el,
    });
  }

  // === Reporting ===
  private async reportStepSeen(step: SessionStep): Promise<void> {
    await this.socketService.goToStep({
      sessionId: this.getSessionId(),
      stepId: String(step.id),
    });
  }

  // === Lifecycle ===
  protected onDestroy(): void {
    this.resetStepTrigger();
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
    this.watcherTargetKey = null;
    this.pendingWatcherStore = null;
  }

  protected onReset(): void {
    this.resetStepTrigger();
  }
}
