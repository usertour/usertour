import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class MixpanelAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w.mixpanel) {
      console.log('Sending event to Mixpanel:', event.eventName);
      this.w.mixpanel.track(event.eventName, {
        distinct_id: event.userId, // Mixpanel uses `distinct_id` for user identification
        ...event.eventData,
      });
      console.log('Event sent to Mixpanel:', event.eventName);
    } else {
      console.warn('Mixpanel is not initialized.');
    }
  }
}
