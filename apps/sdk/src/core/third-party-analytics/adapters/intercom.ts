import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class IntercomAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w.Intercom) {
      console.log('Sending event to Intercom:', event.eventName);
      this.w.Intercom('trackEvent', event.eventName, {
        user_id: event.userId,
        ...event.eventData,
      });
      console.log('Event sent to Intercom:', event.eventName);
    } else {
      console.warn('Intercom is not initialized.');
    }
  }
}
