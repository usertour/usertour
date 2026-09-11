import { BizEvents, EventAttributes } from '@usertour/types';

/** Which record type an occurrence is written to; each event type is declared once per object. */
export type TimelineObject = 'contact' | 'company';

/** The event type uid declared in the app project for this event and object (`<codeName>_<object>`). */
export const timelineEventTypeName = (codeName: string, object: TimelineObject): string =>
  `${codeName}_${object}`;

type Properties = Record<string, string | number>;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;
const number = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * The SDK's end reasons, in words a timeline reader understands. The
 * vocabulary is the SDK's (`contentEndReason`); anything new falls back to
 * the raw value with underscores spaced out rather than being dropped.
 */
const END_REASON_LABELS: Record<string, string> = {
  user_closed: 'dismissed',
  close_button_dismiss: 'dismissed',
  backdrop_dismiss: 'dismissed',
  dismiss_button: 'dismissed',
  action_dismiss: 'dismissed',
  trigger_dismiss: 'dismissed',
  auto_dismissed: 'dismissed automatically',
  action: 'ended by an action',
  replaced: 'replaced by other content',
  user_started_other_content: 'replaced by other content',
  program_started_other_content: 'replaced by other content',
  tooltip_target_missing: 'target missing',
  step_not_found: 'step missing',
  content_not_found: 'content missing',
  store_not_found: 'content missing',
  unpublished_content: 'content unpublished',
  session_timeout: 'session timed out',
  system_closed: 'ended by the system',
  url_start_closed: 'ended by the system',
  end_from_program: 'ended by the system',
  launcher_deactivated: 'launcher deactivated',
  admin_ended: 'ended by an admin',
};
const endReasonLabel = (value: unknown): string | undefined => {
  const raw = text(value);
  return raw ? (END_REASON_LABELS[raw] ?? raw.replace(/_/g, ' ')) : undefined;
};

const put = (target: Properties, name: string, value: string | number | undefined) => {
  if (value !== undefined) {
    target[name] = value;
  }
};

/**
 * The occurrence properties for one tracked event, matching the property
 * schema declared for its event type (integrations/hubspot/src/app/app-events).
 * Only the declared, filled-in properties go out; the provider rejects
 * unknown names.
 */
export const timelinePropertiesFor = (
  codeName: string,
  attributes: Record<string, unknown>,
  userExternalId: string,
): Properties => {
  const properties: Properties = {};
  const flow = () => {
    put(properties, 'flow_name', text(attributes[EventAttributes.FLOW_NAME]));
    put(properties, 'flow_version', number(attributes[EventAttributes.FLOW_VERSION_NUMBER]));
  };
  const checklist = () => {
    put(properties, 'checklist_name', text(attributes[EventAttributes.CHECKLIST_NAME]));
    put(
      properties,
      'checklist_version',
      number(attributes[EventAttributes.CHECKLIST_VERSION_NUMBER]),
    );
  };
  switch (codeName) {
    case BizEvents.FLOW_STARTED:
    case BizEvents.FLOW_COMPLETED:
      flow();
      break;
    case BizEvents.FLOW_ENDED:
      flow();
      put(
        properties,
        'flow_end_reason',
        endReasonLabel(attributes[EventAttributes.FLOW_END_REASON]),
      );
      put(properties, 'flow_step_name', text(attributes[EventAttributes.FLOW_STEP_NAME]));
      put(properties, 'flow_step_number', number(attributes[EventAttributes.FLOW_STEP_NUMBER]));
      break;
    case BizEvents.CHECKLIST_STARTED:
    case BizEvents.CHECKLIST_COMPLETED:
      checklist();
      break;
    case BizEvents.CHECKLIST_TASK_COMPLETED:
      checklist();
      put(properties, 'checklist_task_name', text(attributes[EventAttributes.CHECKLIST_TASK_NAME]));
      break;
    case BizEvents.QUESTION_ANSWERED: {
      put(properties, 'question_name', text(attributes[EventAttributes.QUESTION_NAME]));
      put(properties, 'question_type', text(attributes[EventAttributes.QUESTION_TYPE]));
      const list = attributes[EventAttributes.LIST_ANSWER];
      const answer =
        text(attributes[EventAttributes.TEXT_ANSWER]) ??
        (Array.isArray(list) && list.length > 0 ? list.map(String).join(', ') : undefined) ??
        (number(attributes[EventAttributes.NUMBER_ANSWER]) !== undefined
          ? String(attributes[EventAttributes.NUMBER_ANSWER])
          : undefined);
      put(properties, 'answer', answer);
      put(properties, 'score', number(attributes[EventAttributes.NUMBER_ANSWER]));
      put(properties, 'flow_name', text(attributes[EventAttributes.FLOW_NAME]));
      break;
    }
    case BizEvents.LAUNCHER_ACTIVATED:
      put(properties, 'launcher_name', text(attributes[EventAttributes.LAUNCHER_NAME]));
      put(
        properties,
        'launcher_version',
        number(attributes[EventAttributes.LAUNCHER_VERSION_NUMBER]),
      );
      break;
    default:
      break;
  }
  put(properties, 'usertour_user_id', userExternalId);
  put(properties, 'page_url', text(attributes[EventAttributes.PAGE_URL]));
  return properties;
};
