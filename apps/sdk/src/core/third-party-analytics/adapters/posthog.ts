import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class PostHogAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w.posthog) {
      console.log('Sending event to PostHog:', event.eventName);
      this.w.posthog.capture(event.eventName, {
        distinct_id: event.userId, // PostHog uses `distinct_id` for user identification
        ...event.eventData,
      });
      console.log('Event sent to PostHog:', event.eventName);
    } else {
      console.warn('PostHog is not initialized.');
    }
  }
}
