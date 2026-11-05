import { flowReasonTitleMap } from '@usertour/constants';
import { extractQuestionData } from '@usertour/helpers';
import {
  Attribute,
  AttributeBizTypes,
  BizEvents,
  ChecklistData,
  ContentDataType,
  ContentVersion,
  EventAttributes,
  contentEndReason,
  contentStartReason,
  ContentEditorElementType,
} from '@usertour/types';
import { type BizEvent, type SessionExportRow } from '@usertour/data';
import { contentTypesConfig } from '@/components/editor/utils/config';
import { attributeText } from '@/utils/attributes';

type DateRange = {
  from?: Date;
  to?: Date;
};

type BuildExportPayloadArgs = {
  sessions: SessionExportRow[];
  contentType?: ContentDataType;
  contentName?: string;
  includeAllAttributes: boolean;
  attributeList?: Attribute[];
  version?: ContentVersion;
  dateRange?: DateRange;
};

type ExportPayload = {
  headers: string[];
  rows: Array<Array<string | number>>;
  csvContent: string;
  filename: string;
};

type ExportMode = {
  isBannerContent: boolean;
  isLauncherContent: boolean;
  isChecklistContent: boolean;
  isResourceCenterContent: boolean;
  isEmbedContent: boolean;
  isSimpleExport: boolean;
};

type HeaderContext = {
  questionHeaders: Map<string, string>;
  stepHeaders: Map<string, string>;
  checklistTaskHeaders: Map<string, string>;
};

const BASE_HEADERS = ['User: ID', 'User: Name', 'User: Email'];
const BASIC_COMPANY_HEADERS = ['Company: ID', 'Company: Name'];

const getExportMode = (contentType?: ContentDataType): ExportMode => {
  const isBannerContent = contentType === ContentDataType.BANNER;
  const isLauncherContent = contentType === ContentDataType.LAUNCHER;
  const isChecklistContent = contentType === ContentDataType.CHECKLIST;
  const isResourceCenterContent = contentType === ContentDataType.RESOURCE_CENTER;
  const isEmbedContent = contentType === ContentDataType.EMBED;

  return {
    isBannerContent,
    isLauncherContent,
    isChecklistContent,
    isResourceCenterContent,
    isEmbedContent,
    // An embed is step-bodied and carries questions, so it exports as a flow does
    isSimpleExport: isBannerContent || isLauncherContent || isResourceCenterContent,
  };
};

const getUserAttributes = (includeAllAttributes: boolean, attributeList?: Attribute[]) => {
  if (!includeAllAttributes) {
    return [];
  }

  return (
    attributeList?.filter(
      (attr) =>
        attr.bizType === AttributeBizTypes.User &&
        attr.codeName !== 'name' &&
        attr.codeName !== 'email',
    ) || []
  );
};

const formatUTCDate = (date: string | null | undefined) => {
  if (!date) return '';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = parsedDate.getUTCFullYear();
  const month = pad(parsedDate.getUTCMonth() + 1);
  const day = pad(parsedDate.getUTCDate());
  const hours = pad(parsedDate.getUTCHours());
  const minutes = pad(parsedDate.getUTCMinutes());
  const seconds = pad(parsedDate.getUTCSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const formatLocalDateForFilename = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${year}-${month}-${day}`;
};

const sanitizeContentName = (contentName?: string) => {
  return Array.from((contentName || 'content').trim())
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 40)
    .replace(/-+$/g, '');
};

const toCSVCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  const normalizedValue = String(value).replace(/\r?\n/g, ' ');
  if (/[",]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
};

const getLastActivityAt = (session: SessionExportRow) => {
  if (!session.bizEvent || session.bizEvent.length === 0) {
    return session.createdAt;
  }

  return session.bizEvent.reduce((latest, event) => {
    return new Date(event.createdAt) > new Date(latest) ? event.createdAt : latest;
  }, session.createdAt);
};

const getLatestEventCreatedAt = (events: BizEvent[], codeNames: BizEvents[]) => {
  const matchedEvents = events.filter((event) =>
    codeNames.includes(event.event?.codeName as BizEvents),
  );

  if (matchedEvents.length === 0) {
    return '';
  }

  return matchedEvents.reduce((latest, event) => {
    return new Date(event.createdAt) > new Date(latest) ? event.createdAt : latest;
  }, matchedEvents[0].createdAt);
};

const getCompletedAt = (session: SessionExportRow, contentType?: ContentDataType) => {
  const events = session.bizEvent || [];
  if (events.length === 0) {
    return '';
  }

  if (contentType === ContentDataType.CHECKLIST) {
    return getLatestEventCreatedAt(events, [BizEvents.CHECKLIST_COMPLETED]);
  }

  if (contentType === ContentDataType.LAUNCHER) {
    return getLatestEventCreatedAt(events, [BizEvents.LAUNCHER_ACTIVATED]);
  }

  if (contentType === ContentDataType.BANNER) {
    return getLatestEventCreatedAt(events, [BizEvents.BANNER_DISMISSED]);
  }

  return getLatestEventCreatedAt(events, [BizEvents.FLOW_COMPLETED]);
};

const getState = (session: SessionExportRow, contentType?: ContentDataType) => {
  const events = session.bizEvent || [];
  if (events.length === 0) {
    return contentType === ContentDataType.CHECKLIST || contentType === ContentDataType.EMBED
      ? 'Active'
      : 'In Progress';
  }

  if (contentType === ContentDataType.BANNER) {
    const isDismissed = !!events.find((e) => e.event?.codeName === BizEvents.BANNER_DISMISSED);
    const isSeen = !!events.find((e) => e.event?.codeName === BizEvents.BANNER_SEEN);
    if (isDismissed) return 'Dismissed';
    if (isSeen) return 'Seen';
    return 'In Progress';
  }

  // An embed has no completion: the words of the session list's status badge
  if (contentType === ContentDataType.EMBED) {
    const isDismissed = !!events.find((e) => e.event?.codeName === BizEvents.EMBED_DISMISSED);
    const isClicked = !!events.find((e) => e.event?.codeName === BizEvents.BUTTON_CLICKED);
    if (isDismissed) return 'Dismissed';
    if (isClicked) return 'Clicked';
    return 'Active';
  }

  if (contentType === ContentDataType.LAUNCHER) {
    const isDismissed = !!events.find((e) => e.event?.codeName === BizEvents.LAUNCHER_DISMISSED);
    const isActivated = !!events.find((e) => e.event?.codeName === BizEvents.LAUNCHER_ACTIVATED);
    const isSeen = !!events.find((e) => e.event?.codeName === BizEvents.LAUNCHER_SEEN);
    if (isDismissed) return 'Dismissed';
    if (isActivated) return 'Activated';
    if (isSeen) return 'Seen';
    return 'In Progress';
  }

  if (contentType === ContentDataType.CHECKLIST) {
    const isComplete = !!events.find((e) => e.event?.codeName === BizEvents.CHECKLIST_COMPLETED);
    const isDismissed = !!events.find((e) => e.event?.codeName === BizEvents.CHECKLIST_DISMISSED);
    if (isComplete) return 'Completed';
    if (isDismissed) return 'Dismissed';
    return 'Active';
  }

  const isComplete = !!events.find((e) => e.event?.codeName === BizEvents.FLOW_COMPLETED);
  const isDismissed = !!events.find((e) => e.event?.codeName === BizEvents.FLOW_ENDED);
  if (isComplete) return 'Completed';
  if (isDismissed) return 'Dismissed';
  return 'In Progress';
};

const getQuestionAnswer = (answerEvent: BizEvent): string => {
  const data = answerEvent.data ?? {};
  switch (data.question_type) {
    case ContentEditorElementType.STAR_RATING:
    case ContentEditorElementType.SCALE:
    case ContentEditorElementType.NPS:
      return attributeText(data.number_answer);
    case ContentEditorElementType.MULTIPLE_CHOICE:
      return attributeText(data.list_answer) || attributeText(data.text_answer);
    case ContentEditorElementType.MULTI_LINE_TEXT:
      return attributeText(data.text_answer).replace(/\n/g, ' ');
    default:
      return attributeText(data.text_answer).replace(/\n/g, ' ');
  }
};

/**
 * Where a session's start and end reasons are recorded, for the types whose
 * export carries them.
 */
const SESSION_REASON_SOURCES: Partial<
  Record<
    ContentDataType,
    {
      startEvent: BizEvents;
      startReason: EventAttributes;
      endEvent: BizEvents;
      endReason: EventAttributes;
    }
  >
> = {
  [ContentDataType.FLOW]: {
    startEvent: BizEvents.FLOW_STARTED,
    startReason: EventAttributes.FLOW_START_REASON,
    endEvent: BizEvents.FLOW_ENDED,
    endReason: EventAttributes.FLOW_END_REASON,
  },
  [ContentDataType.CHECKLIST]: {
    startEvent: BizEvents.CHECKLIST_STARTED,
    startReason: EventAttributes.CHECKLIST_START_REASON,
    endEvent: BizEvents.CHECKLIST_DISMISSED,
    endReason: EventAttributes.CHECKLIST_END_REASON,
  },
  [ContentDataType.EMBED]: {
    startEvent: BizEvents.EMBED_STARTED,
    startReason: EventAttributes.EMBED_START_REASON,
    endEvent: BizEvents.EMBED_DISMISSED,
    endReason: EventAttributes.EMBED_END_REASON,
  },
};

const hasSessionReasons = (contentType?: ContentDataType) =>
  !!contentType && !!SESSION_REASON_SOURCES[contentType];

const getSessionReasons = (events: BizEvent[], contentType?: ContentDataType) => {
  const source = contentType ? SESSION_REASON_SOURCES[contentType] : undefined;
  if (!source) {
    return { startReason: '', endReason: '' };
  }

  const startEvent = events.find((event) => event.event?.codeName === source.startEvent);
  const endEvent = events.find((event) => event.event?.codeName === source.endEvent);

  const startReasonKey = startEvent?.data?.[source.startReason] as contentStartReason;
  const endReasonKey = endEvent?.data?.[source.endReason] as contentEndReason;

  return {
    startReason: flowReasonTitleMap[startReasonKey] || startReasonKey || '',
    endReason: flowReasonTitleMap[endReasonKey] || endReasonKey || '',
  };
};

const collectHeaderContext = (
  contentType: ContentDataType | undefined,
  version?: ContentVersion,
) => {
  const questionHeaders = new Map<string, string>();
  const stepHeaders = new Map<string, string>();
  const checklistTaskHeaders = new Map<string, string>();

  if (version?.steps) {
    for (const step of version.steps) {
      const questions = extractQuestionData(step.data);
      for (const question of questions) {
        if (question.data?.name && question.data?.cvid) {
          const questionType =
            contentTypesConfig.find((config) => config.element.type === question.type)?.name ||
            question.type;
          questionHeaders.set(
            question.data.cvid,
            `Question (${questionType}): ${question.data.name}`,
          );
        }
      }

      if (step.name) {
        stepHeaders.set(step.sequence.toString(), `Step ${step.sequence + 1}. ${step.name}`);
      }
    }
  }

  const checklistData = version?.data as ChecklistData | undefined;
  if (contentType === ContentDataType.CHECKLIST && checklistData?.items?.length) {
    for (const [index, item] of checklistData.items.entries()) {
      checklistTaskHeaders.set(item.id, `Task ${index + 1}. ${item.name}`);
    }
  }

  return {
    questionHeaders,
    stepHeaders,
    checklistTaskHeaders,
  };
};

const buildCompanyHeaders = (maxCompanies: number) => {
  if (maxCompanies <= 1) {
    return BASIC_COMPANY_HEADERS;
  }

  return Array.from({ length: maxCompanies }, (_, i) => [
    `Company(${i + 1}): ID`,
    `Company(${i + 1}): Name`,
  ]).flat();
};

const buildOtherHeaders = (contentType: ContentDataType | undefined, mode: ExportMode) => {
  if (mode.isResourceCenterContent) {
    return ['Started at (UTC)'];
  }
  if (mode.isSimpleExport) {
    return ['Version', 'Started at (UTC)', ...(mode.isLauncherContent ? ['Activated'] : [])];
  }

  // An embed has no completion and no progress; its success action is a
  // button press, so it lists the buttons pressed instead.
  if (mode.isEmbedContent) {
    return [
      'Version',
      'Started at (UTC)',
      'Last activity at (UTC)',
      'State',
      'Clicked buttons',
      'Start reason',
      'End reason',
    ];
  }

  return [
    'Version',
    'Started at (UTC)',
    'Last activity at (UTC)',
    'Completed at (UTC)',
    'Progress',
    'State',
    ...(hasSessionReasons(contentType) ? ['Start reason', 'End reason'] : []),
  ];
};

const buildHeaders = (
  userAttributes: Attribute[],
  companyHeaders: string[],
  otherHeaders: string[],
  headerContext: HeaderContext,
  mode: ExportMode,
) => {
  const userAttributeHeaders = userAttributes.map((attr) => `User: ${attr.displayName}`);

  const questionColumns = mode.isSimpleExport
    ? []
    : mode.isChecklistContent
      ? []
      : Array.from(headerContext.questionHeaders.values());

  const trailingColumns = mode.isSimpleExport
    ? []
    : mode.isChecklistContent
      ? Array.from(headerContext.checklistTaskHeaders.values())
      : Array.from(headerContext.stepHeaders.values());

  return [
    ...BASE_HEADERS,
    ...userAttributeHeaders,
    ...companyHeaders,
    ...otherHeaders,
    ...questionColumns,
    ...trailingColumns,
  ];
};

const buildQuestionAnswers = (events: BizEvent[]) => {
  const questionAnswers = new Map<string, string>();

  for (const event of events) {
    const questionCvid = attributeText(event.data?.[EventAttributes.QUESTION_CVID]);
    if (questionCvid) {
      questionAnswers.set(questionCvid, getQuestionAnswer(event));
    }
  }

  return questionAnswers;
};

const buildStepViews = (
  events: BizEvent[],
  stepHeaders: Map<string, string>,
  contentType?: ContentDataType,
) => {
  const stepViews = new Map<string, number>();
  // A flow's and an embed's steps are seen under their own event and attribute
  const isEmbed = contentType === ContentDataType.EMBED;
  const stepSeenEvent = isEmbed ? BizEvents.EMBED_STEP_SEEN : BizEvents.FLOW_STEP_SEEN;
  const stepNumberAttribute = isEmbed
    ? EventAttributes.EMBED_STEP_NUMBER
    : EventAttributes.FLOW_STEP_NUMBER;

  for (const stepNumber of stepHeaders.keys()) {
    const stepIndex = Number.parseInt(stepNumber, 10);
    const viewCount = events.filter(
      (event) =>
        event.event?.codeName === stepSeenEvent && event.data?.[stepNumberAttribute] === stepIndex,
    ).length;

    stepViews.set(stepNumber, viewCount);
  }

  return stepViews;
};

/** The texts of the buttons pressed in a session, in the order they were pressed. */
const buildClickedButtons = (events: BizEvent[]) =>
  events
    .filter((event) => event.event?.codeName === BizEvents.BUTTON_CLICKED)
    .sort(
      (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
    )
    .map((event) => attributeText(event.data?.[EventAttributes.BUTTON_TEXT]))
    .filter(Boolean)
    .join(', ');

const buildChecklistCompletedTaskIds = (events: BizEvent[]) => {
  return new Set(
    events
      .filter((event) => event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED)
      .map((event) => String(event.data?.[EventAttributes.CHECKLIST_TASK_ID] ?? '')),
  );
};

const buildFilename = (contentName: string | undefined, dateRange?: DateRange) => {
  const safeContentName = sanitizeContentName(contentName);
  const fromDate = dateRange?.from ? formatLocalDateForFilename(dateRange.from) : 'all';
  const toDate = dateRange?.to ? formatLocalDateForFilename(dateRange.to) : 'all';

  return `Usertour-${safeContentName}-sessions-${fromDate}_to_${toDate}.csv`;
};

const buildRows = (args: {
  sessions: SessionExportRow[];
  contentType?: ContentDataType;
  userAttributes: Attribute[];
  maxCompanies: number;
  mode: ExportMode;
  headerContext: HeaderContext;
}) => {
  const { sessions, contentType, userAttributes, maxCompanies, mode, headerContext } = args;

  return sessions.map((session) => {
    const events = session.bizEvent || [];
    const { startReason, endReason } = getSessionReasons(events, contentType);
    const includeReasonColumns = hasSessionReasons(contentType);

    const questionAnswers = buildQuestionAnswers(events);
    const stepViews = buildStepViews(events, headerContext.stepHeaders, contentType);
    const checklistCompletedTaskIds = buildChecklistCompletedTaskIds(events);

    const baseRow = [
      session.bizUser?.externalId || '',
      attributeText(session.bizUser?.data?.name),
      attributeText(session.bizUser?.data?.email),
    ];

    const userAttributeValues = userAttributes.map((attr) => {
      const value = session.bizUser?.data?.[attr.codeName];
      return typeof value === 'string' ? value : JSON.stringify(value || '');
    });

    const companies = session.bizUser?.bizUsersOnCompany || [];
    const companyValues = Array.from({ length: maxCompanies }, (_, i) => {
      const company = companies[i];
      return [
        company?.bizCompany?.externalId || '',
        attributeText(company?.bizCompany?.data?.name),
      ];
    }).flat();

    const activatedCount = events.filter(
      (event) => event.event?.codeName === BizEvents.LAUNCHER_ACTIVATED,
    ).length;

    const commonInfo = mode.isResourceCenterContent
      ? [formatUTCDate(session.createdAt)]
      : mode.isSimpleExport
        ? [
            `v${session.version?.sequence}`,
            formatUTCDate(session.createdAt),
            ...(mode.isLauncherContent ? [activatedCount] : []),
          ]
        : mode.isEmbedContent
          ? [
              `v${session.version?.sequence}`,
              formatUTCDate(session.createdAt),
              formatUTCDate(getLastActivityAt(session)),
              getState(session, contentType),
              buildClickedButtons(events),
              startReason,
              endReason,
            ]
          : [
              `v${session.version?.sequence}`,
              formatUTCDate(session.createdAt),
              formatUTCDate(getLastActivityAt(session)),
              formatUTCDate(getCompletedAt(session, contentType)),
              `${session.progress}%`,
              getState(session, contentType),
              ...(includeReasonColumns ? [startReason, endReason] : []),
            ];

    const questionAnswersRow = mode.isSimpleExport
      ? []
      : mode.isChecklistContent
        ? []
        : Array.from(headerContext.questionHeaders.keys()).map(
            (cvid) => questionAnswers.get(cvid) || '',
          );

    const checklistOrStepRow = mode.isSimpleExport
      ? []
      : mode.isChecklistContent
        ? Array.from(headerContext.checklistTaskHeaders.keys()).map((taskId) =>
            checklistCompletedTaskIds.has(taskId) ? '✔' : '',
          )
        : Array.from(headerContext.stepHeaders.keys()).map(
            (stepNumber) => stepViews.get(stepNumber) || 0,
          );

    return [
      ...baseRow,
      ...userAttributeValues,
      ...companyValues,
      ...commonInfo,
      ...questionAnswersRow,
      ...checklistOrStepRow,
    ];
  });
};

export const buildExportPayload = (args: BuildExportPayloadArgs): ExportPayload => {
  const {
    sessions,
    contentType,
    contentName,
    includeAllAttributes,
    attributeList,
    version,
    dateRange,
  } = args;

  const mode = getExportMode(contentType);
  const userAttributes = getUserAttributes(includeAllAttributes, attributeList);
  const headerContext = collectHeaderContext(contentType, version);

  const maxCompanies = Math.max(
    ...sessions.map((session) => session.bizUser?.bizUsersOnCompany?.length || 0),
    1,
  );

  const companyHeaders = buildCompanyHeaders(maxCompanies);
  const otherHeaders = buildOtherHeaders(contentType, mode);
  const headers = buildHeaders(userAttributes, companyHeaders, otherHeaders, headerContext, mode);

  const rows = buildRows({
    sessions,
    contentType,
    userAttributes,
    maxCompanies,
    mode,
    headerContext,
  });

  const csvContent = [
    headers.map(toCSVCell).join(','),
    ...rows.map((row) => row.map(toCSVCell).join(',')),
  ].join('\n');

  const filename = buildFilename(contentName, dateRange);

  return {
    headers,
    rows,
    csvContent,
    filename,
  };
};
