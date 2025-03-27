import { BizEvents } from '@/common/consts/attribute';
import { BizSession } from '@prisma/client';

export const getEventProgress = (eventName: string, customProgress: number) => {
  if (eventName === BizEvents.FLOW_COMPLETED) {
    return 100;
  }
  if (eventName === BizEvents.FLOW_STEP_SEEN) {
    return customProgress;
  }
  return 0;
};

export const getEventState = (eventName: string) => {
  if (eventName === BizEvents.FLOW_ENDED) {
    return 1;
  }
  if (eventName === BizEvents.CHECKLIST_DISMISSED) {
    return 1;
  }
  if (eventName === BizEvents.LAUNCHER_DISMISSED) {
    return 1;
  }
  return 0;
};

export const isValidEvent = (eventName: string, bizSession: BizSession, events: any) => {
  if (eventName === BizEvents.FLOW_STEP_SEEN && events.flow_step_progress < bizSession.progress) {
    return false;
  }
  return true;
};
