import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class GoogleAnalyticsAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (typeof this.w.gtag === 'function') {
      console.log('event...', event, this.w.gtag);
      this.w.gtag('event', event.eventName, {
        user_id: event.userId,
        session_id: new Date().toISOString(),
        ...event.eventData,
      });
      console.log('Event sent to GA');
    }
  }
}
