import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class SegmentAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w.analytics) {
      console.log('Sending event to Segment:', event.eventName);
      this.w.analytics.track(event.eventName, {
        userId: event.userId,
        ...event.eventData,
      });
      console.log('Event sent to Segment:', event.eventName);
    } else {
      console.warn('Segment is not initialized.');
    }
  }
}
