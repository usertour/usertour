import { convertSettings } from '@usertour-ui/shared-utils';
import { convertToCssVars } from '@usertour-ui/shared-utils';
import {
  EventAttributes,
  SDKContent,
  Step,
  Theme,
  UserTourTypes,
  flowEndReason,
  flowStartReason,
} from '@usertour-ui/types';
import { isEqual } from 'lodash';
import { ReportEventOptions, ReportEventParams } from '../types/content';
import autoBind from '../utils/auto-bind';
import { isValidContent } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { window } from '../utils/globals';
import { buildNavigateUrl } from '../utils/navigate-utils';
import { App } from './app';
import { getAssets } from './common';
import { Config } from './config';
import { Evented } from './evented';
import { ExternalStore } from './store';

export abstract class BaseContent<T = any> extends Evented {
  private readonly instance: App;
  private content: SDKContent;
  private readonly store: ExternalStore<T>;
  private readonly config: Config;
  private isDismissed = false;
  private isStarted = false;
  private sessionId = '';
  private currentStep?: Step | null;
  constructor(instance: App, content: SDKContent, defaultStore: T) {
    super();
    autoBind(this);
    this.store = new ExternalStore<T>(defaultStore);
    this.config = new Config(content.config);
    this.instance = instance;
    this.content = structuredClone(content);
    this.initializeEventListeners();
  }

  async autoStart(reason?: string) {
    if (!this.canAutoStart()) {
      await this.cancel();
      return;
    }
    if (this.isStarted) {
      return;
    }
    this.reset();

    if (this.isWaitStart()) {
      await this.waitStart();
    }

    await this.start(reason);
  }

  async start(reason?: string) {
    const reusedSessionId = this.getReusedSessionId();
    const sessionId = reusedSessionId || (await this.createSessionId());
    if (!sessionId) {
      throw new Error('Failed to create user session.');
    }
    this.sessionId = sessionId;
    this.isStarted = true;
    this.trigger(AppEvents.CONTENT_AUTO_START_ACTIVATED, { reason });
    this.show();
  }

  canAutoStart() {
    return !this.hasDismissed() && this.isAutoStart() && this.isValid() && this.hasContainer();
  }

  hasDismissed() {
    return this.isDismissed;
  }

  setDismissed(value: boolean) {
    this.isDismissed = value;
  }

  hasStarted() {
    return this.isStarted;
  }

  getSessionId() {
    return this.sessionId;
  }

  // Common methods
  getContent() {
    return this.content;
  }

  setContent(content: SDKContent) {
    this.content = structuredClone(content);
    this.config.setConfig(content.config);
  }

  isValid() {
    const contents = this.getOriginContents();
    if (!contents) {
      return false;
    }
    return isValidContent(this.getContent(), contents);
  }

  private getInstance() {
    return this.instance;
  }

  private getConfig() {
    return this.config;
  }

  getStore() {
    return this.store;
  }

  setStore(store: T) {
    this.store.setData(store);
  }

  open() {
    this.updateStore({ openState: true } as unknown as Partial<T>);
  }

  hide() {
    this.updateStore({ openState: false } as unknown as Partial<T>);
  }

  updateStore(store: Partial<T>) {
    this.store.update(store);
  }

  isWaitStart(): boolean {
    return this.getConfig().isWait();
  }

  async waitStart() {
    return await this.getConfig().wait();
  }

  isAutoStart(): boolean {
    return this.getConfig().isAutoStart();
  }

  getConfigPriority() {
    return this.getConfig().getPriority();
  }

  isTemporarilyHidden() {
    return this.getConfig().isTemporarilyHidden();
  }

  hasContainer() {
    return !!this.getInstance().container;
  }

  getUserInfo() {
    return this.getInstance().userInfo;
  }

  getThemes() {
    return this.getInstance().themes;
  }

  getOriginContents() {
    return this.getInstance().originContents;
  }

  getBaseZIndex() {
    return this.getInstance().getBaseZIndex();
  }

  closeActiveTour(reason?: flowEndReason) {
    return this.getInstance().closeActiveTour(reason);
  }

  startTour(contentId: string | undefined, reason: string) {
    return this.getInstance().startTour(contentId, reason);
  }

  getActiveTour() {
    return this.getInstance().activeTour;
  }

  setCurrentStep(step: Step | null) {
    this.currentStep = step;
  }

  getCurrentStep() {
    return this.currentStep;
  }

  async updateUser(attributes: UserTourTypes.Attributes) {
    return await this.getInstance().updateUser(attributes);
  }

  async createSessionId() {
    const session = await this.getInstance().createSession(this.getContent().contentId);
    return session?.id;
  }

  private async reportEvent(event: Partial<ReportEventParams>, options: ReportEventOptions = {}) {
    const userInfo = this.getUserInfo();
    const content = this.getContent();
    const { externalId: userId } = userInfo || {};
    const { contentId } = content;
    const { eventName, eventData, sessionId } = event;

    // Early return if required fields are missing
    if (!userId || !contentId || !eventName || !eventData) {
      return;
    }

    const reportEvent: ReportEventParams = {
      eventData: {
        ...eventData,
        [EventAttributes.PAGE_URL]: window?.location?.href,
        [EventAttributes.VIEWPORT_WIDTH]: window?.innerWidth,
        [EventAttributes.VIEWPORT_HEIGHT]: window?.innerHeight,
      },
      eventName,
      contentId,
      userId,
      sessionId,
    };

    return await this.getInstance().reportEvent(reportEvent, options);
  }

  async reportEventWithSession(
    event: Partial<ReportEventParams>,
    options: ReportEventOptions = {},
  ) {
    const sessionId = this.getSessionId();
    if (!sessionId) {
      return;
    }
    await this.reportEvent(
      {
        ...event,
        sessionId,
      },
      options,
    );
  }

  getCompanyInfo() {
    return this.getInstance().companyInfo;
  }

  async cancelActiveTour() {
    return await this.getInstance().cancelActiveTour();
  }

  async startNewTour(contentId: string) {
    await this.cancelActiveTour();
    await this.startTour(contentId, flowStartReason.ACTION);
  }

  handleNavigate(data: any) {
    const userInfo = this.getUserInfo();
    const url = buildNavigateUrl(data.value, userInfo);
    window?.top?.open(url, data.openType === 'same' ? '_self' : '_blank');
  }

  async activeContentConditions() {
    return await this.getConfig().activeConditions();
  }

  getSdkConfig() {
    return this.getInstance().getSdkConfig();
  }

  getStoreBaseInfo() {
    const themes = this.getThemes();
    const userInfo = this.getUserInfo();
    const zIndex = this.getBaseZIndex();
    const sdkConfig = this.getSdkConfig();
    if (!themes || themes.length === 0) {
      return {};
    }
    let theme: Theme | undefined;
    const currentStep = this.getCurrentStep();
    if (currentStep?.themeId) {
      theme = themes.find((item) => item.id === currentStep?.themeId);
    } else {
      theme = themes.find((item) => this.getContent()?.themeId === item.id);
    }
    if (!theme) {
      return {};
    }
    return {
      sdkConfig,
      assets: getAssets(theme),
      globalStyle: convertToCssVars(convertSettings(theme.settings)),
      theme,
      zIndex,
      userInfo,
    };
  }

  isEqual(newContent: SDKContent) {
    return isEqual(this.getContent(), newContent);
  }

  abstract getReusedSessionId(): string | null;
  abstract monitor(): Promise<void>;
  abstract destroy(): void;
  abstract show(): void;
  abstract cancel(): Promise<void>;
  abstract reset(): void;
  abstract refresh(): void;
  abstract initializeEventListeners(): void;
}
