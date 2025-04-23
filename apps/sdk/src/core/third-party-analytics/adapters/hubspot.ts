import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class HubSpotAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w._hsq) {
      console.log('Sending event to HubSpot:', event.eventName);
      this.w._hsq.push([
        'trackEvent',
        {
          id: event.eventName,
          userId: event.userId,
          ...event.eventData,
        },
      ]);
      console.log('Event sent to HubSpot:', event.eventName);
    } else {
      console.warn('HubSpot is not initialized.');
    }
  }
}
