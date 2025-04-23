export type BaseAnalyticsEvent = {
  eventName: string;
  userId: string;
  eventData?: Record<string, any>; // to be fixed soon
};

export type BaseAnalyticsAdapterType = {
  sendEvent(event: {
    eventName: string;
    userId: string;
    eventData?: BaseAnalyticsEvent['eventData'];
  }): void;
};

export interface WindowWithIntegration extends Window {
  gtag?: any;
  amplitude?: any;
  mixpanel?: any;
  Intercom?: any;
  LogRocket?: any;
  analytics?: any; // for segment
  _hsq?: any; // for hubspot
  _learnq?: any; // for klaviyo
  posthog?: any;
}
