import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class KlaviyoAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w._learnq) {
      console.log('Sending event to Klaviyo:', event.eventName);
      this.w._learnq.push([
        'track',
        event.eventName,
        {
          $id: event.userId,
          ...event.eventData,
        },
      ]);
      console.log('Event sent to Klaviyo:', event.eventName);
    } else {
      console.warn('Klaviyo is not initialized.');
    }
  }
}
