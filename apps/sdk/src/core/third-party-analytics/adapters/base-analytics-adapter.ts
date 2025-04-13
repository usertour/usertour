import {
  BaseAnalyticsAdapterType,
  WindowWithIntegration,
} from '../../../types/third-party-analytics';

export abstract class BaseAnalyticsAdapter implements BaseAnalyticsAdapterType {
  protected w: WindowWithIntegration;

  constructor() {
    this.w = window as WindowWithIntegration;
  }

  abstract sendEvent(event: {
    eventName: string;
    userId?: string;
    eventData?: Record<string, any>;
  }): void;
}
