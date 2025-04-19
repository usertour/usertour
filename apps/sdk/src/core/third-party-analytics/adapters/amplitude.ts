import { BaseAnalyticsAdapter } from './base-analytics-adapter';

export class AmplitudeAdapter extends BaseAnalyticsAdapter {
  sendEvent(event: { eventName: string; userId?: string; eventData?: Record<string, any> }) {
    if (this.w.amplitude) {
      this.w.amplitude.track(event.eventName, {
        user_id: event.userId,
        ...event.eventData,
      });
      console.log('Event sent to Amplitude:', event.eventName);
    } else {
      console.warn('Amplitude is not initialized.');
    }
  }
}
