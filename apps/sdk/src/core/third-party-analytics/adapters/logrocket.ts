import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class LogRocketAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w.LogRocket) {
      console.log('Sending event to LogRocket:', event.eventName);
      this.w.LogRocket.track(event.eventName, {
        user_id: event.userId,
        ...event.eventData,
      });
      console.log('Event sent to LogRocket:', event.eventName);
    } else {
      console.warn('LogRocket is not initialized.');
    }
  }
}
