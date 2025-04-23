import { BaseAnalyticsAdapterType, BaseAnalyticsEvent } from '../../types/third-party-analytics';

class ThirdPartyAnalytics {
  private adapters: BaseAnalyticsAdapterType[] = [];

  registerAdapter(adapter: BaseAnalyticsAdapterType) {
    console.log('Adaptor registered: ', adapter);
    this.adapters.push(adapter);
  }

  sendEvent(event: BaseAnalyticsEvent) {
    for (const adapter of this.adapters) {
      if (typeof window !== 'undefined') adapter.sendEvent(event);
    }
  }
}

export const tpa = new ThirdPartyAnalytics();
