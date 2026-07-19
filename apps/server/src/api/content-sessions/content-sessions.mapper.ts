import { ContentDataType, EventAttributes } from '@usertour/types';

import { extractQuestionData } from '@/utils/content-question';
import { DISMISSED_EVENTS, GENUINE_COMPLETION_EVENTS } from '@/utils/event-v2';

import { ApiObjectType } from '../shared/object-type';
import { ContentSession, ContentSessionAnswer, SessionExpand } from './content-sessions.schema';

const COMPLETION_CODENAMES = new Set<string>(GENUINE_COMPLETION_EVENTS);
const END_CODENAMES = new Set<string>(DISMISSED_EVENTS);

// content type → the `*_end_reason` attribute key on its ending event's data.
const END_REASON_KEY: Partial<Record<string, string>> = {
  [ContentDataType.FLOW]: EventAttributes.FLOW_END_REASON,
  [ContentDataType.CHECKLIST]: EventAttributes.CHECKLIST_END_REASON,
  [ContentDataType.LAUNCHER]: EventAttributes.LAUNCHER_END_REASON,
  [ContentDataType.BANNER]: EventAttributes.BANNER_END_REASON,
  [ContentDataType.RESOURCE_CENTER]: EventAttributes.RESOURCE_CENTER_END_REASON,
};

/**
 * Derive the honest lifecycle fields from a session's loaded lifecycle events.
 * `completed` = a genuine completion event exists (NOT state === 1, which also
 * covers dismissals and misses a still-open completed checklist / a flow that
 * completed at an explicit step and kept running). `endedAt` / `endReason`
 * describe how (if) the session closed.
 */
function deriveLifecycle(session: any): {
  completed: boolean;
  completedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
} {
  const events: any[] = Array.isArray(session.bizEvent) ? session.bizEvent : [];
  const completionEvent = events.find((e) => COMPLETION_CODENAMES.has(e.event?.codeName));
  const endEvent = events.find((e) => END_CODENAMES.has(e.event?.codeName));
  const ended = session.state === 1;
  const reasonKey = END_REASON_KEY[session.content?.type];
  const endReasonRaw =
    endEvent && reasonKey ? (endEvent.data as Record<string, unknown> | null)?.[reasonKey] : null;
  return {
    completed: !!completionEvent,
    completedAt: completionEvent ? completionEvent.createdAt.toISOString() : null,
    // Prefer the ending event's timestamp; fall back to the session's last update.
    endedAt: ended ? (endEvent?.createdAt ?? session.updatedAt).toISOString() : null,
    endReason: typeof endReasonRaw === 'string' ? endReasonRaw : null,
  };
}

/**
 * Pure: match the session's analytics answers to the version's step questions
 * (by cvid) and build the answer DTOs. The service fetches the answers + steps
 * and passes them in. Mirrors the v1 logic.
 */
export function mapSessionAnswers(
  answers: any[],
  steps: { data: unknown }[],
): ContentSessionAnswer[] {
  return answers
    .map((answer) => {
      const matchingStep = steps.find((step) => {
        const questions = extractQuestionData(step.data as any);
        return questions?.some((question: any) => question?.data?.cvid === answer.cvid);
      });
      if (!matchingStep) {
        return null;
      }
      const questions = extractQuestionData(matchingStep.data as any);
      const question = questions?.find((q: any) => q?.data?.cvid === answer.cvid);
      if (!question) {
        return null;
      }
      const answerValue =
        answer.numberAnswer?.toString() ||
        answer.textAnswer ||
        (answer.listAnswer ? JSON.stringify(answer.listAnswer) : '');
      return {
        id: answer.id,
        object: ApiObjectType.CONTENT_SESSION_ANSWER,
        answerType: question.type,
        answerValue,
        createdAt: answer.createdAt.toISOString(),
        questionCvid: question.data.cvid,
        questionName: question.data.name,
      };
    })
    .filter(Boolean) as ContentSessionAnswer[];
}

/**
 * Pure session -> API content-session. `answers` is pre-computed by the service
 * (null unless the answers expand). The embedded `content` is the A-shape
 * lightweight reference (no publish state).
 */
export function mapContentSession(
  session: any,
  expand: SessionExpand[],
  answers: ContentSessionAnswer[] | null,
): ContentSession {
  const has = (e: SessionExpand) => expand.includes(e);
  const lifecycle = deriveLifecycle(session);
  return {
    id: session.id,
    object: ApiObjectType.CONTENT_SESSION,
    answers,
    completed: lifecycle.completed,
    completedAt: lifecycle.completedAt,
    endedAt: lifecycle.endedAt,
    endReason: lifecycle.endReason,
    contentId: session.contentId,
    content:
      has('content') && session.content
        ? {
            id: session.content.id,
            object: ApiObjectType.CONTENT,
            name: session.content.name,
            type: session.content.type,
            editedVersionId: session.content.editedVersionId,
            updatedAt: session.content.updatedAt.toISOString(),
            createdAt: session.content.createdAt.toISOString(),
          }
        : null,
    createdAt: session.createdAt.toISOString(),
    companyId: session.bizCompany?.externalId || null,
    company:
      has('company') && session.bizCompany
        ? {
            id: session.bizCompany.externalId,
            object: ApiObjectType.COMPANY,
            attributes: session.bizCompany.data,
            createdAt: session.bizCompany.createdAt.toISOString(),
          }
        : null,
    isPreview: false,
    lastActivityAt: session.updatedAt.toISOString(),
    progress: session.progress,
    userId: session.bizUser?.externalId || null,
    user:
      has('user') && session.bizUser
        ? {
            id: session.bizUser.externalId,
            object: ApiObjectType.USER,
            attributes: session.bizUser.data,
            createdAt: session.bizUser.createdAt.toISOString(),
          }
        : null,
    versionId: session.versionId,
    version:
      has('version') && session.version
        ? {
            id: session.version.id,
            object: ApiObjectType.CONTENT_VERSION,
            number: session.version.sequence,
            updatedAt: session.version.updatedAt.toISOString(),
            createdAt: session.version.createdAt.toISOString(),
          }
        : null,
  };
}
