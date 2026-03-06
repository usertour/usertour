import { extractQuestionData } from '@usertour/helpers';
import {
  Attribute,
  AttributeBizTypes,
  BizEvent,
  BizEvents,
  BizSession,
  ChecklistData,
  ContentDataType,
  ContentVersion,
  EventAttributes,
  contentEndReason,
  contentStartReason,
  flowReasonTitleMap,
} from '@usertour/types';
import { ContentEditorElementType, contentTypesConfig } from '@usertour-packages/shared-editor';

type DateRange = {
  from?: Date;
  to?: Date;
};

type BuildExportPayloadArgs = {
  sessions: BizSession[];
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

  return {
    isBannerContent,
    isLauncherContent,
    isChecklistContent,
    isSimpleExport: isBannerContent || isLauncherContent,
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

const getLastActivityAt = (session: BizSession) => {
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

const getCompletedAt = (session: BizSession, contentType?: ContentDataType) => {
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

const getState = (session: BizSession, contentType?: ContentDataType) => {
  const events = session.bizEvent || [];
  if (events.length === 0) {
    return contentType === ContentDataType.CHECKLIST ? 'Active' : 'In Progress';
  }

  if (contentType === ContentDataType.BANNER) {
    const isDismissed = !!events.find((e) => e.event?.codeName === BizEvents.BANNER_DISMISSED);
    const isSeen = !!events.find((e) => e.event?.codeName === BizEvents.BANNER_SEEN);
    if (isDismissed) return 'Dismissed';
    if (isSeen) return 'Seen';
    return 'In Progress';
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

const getQuestionAnswer = (answerEvent: BizEvent) => {
  switch (answerEvent.data.question_type) {
    case ContentEditorElementType.STAR_RATING:
    case ContentEditorElementType.SCALE:
    case ContentEditorElementType.NPS:
      return answerEvent.data.number_answer;
    case ContentEditorElementType.MULTIPLE_CHOICE:
      return Array.isArray(answerEvent.data.list_answer)
        ? answerEvent.data.list_answer.join('; ')
        : answerEvent.data.list_answer;
    case ContentEditorElementType.MULTI_LINE_TEXT:
      return (answerEvent.data.text_answer || '').replace(/\n/g, ' ');
    default:
      return (answerEvent.data.text_answer || '').replace(/\n/g, ' ');
  }
};

const getSessionReasons = (events: BizEvent[], contentType?: ContentDataType) => {
  if (contentType !== ContentDataType.FLOW && contentType !== ContentDataType.CHECKLIST) {
    return { startReason: '', endReason: '' };
  }

  const isFlow = contentType === ContentDataType.FLOW;
  const startEvent = events.find((event) =>
    isFlow
      ? event.event?.codeName === BizEvents.FLOW_STARTED
      : event.event?.codeName === BizEvents.CHECKLIST_STARTED,
  );
  const endEvent = events.find((event) =>
    isFlow
      ? event.event?.codeName === BizEvents.FLOW_ENDED
      : event.event?.codeName === BizEvents.CHECKLIST_DISMISSED,
  );

  const startReasonKey = isFlow
    ? (startEvent?.data?.[EventAttributes.FLOW_START_REASON] as contentStartReason)
    : (startEvent?.data?.[EventAttributes.CHECKLIST_START_REASON] as contentStartReason);
  const endReasonKey = isFlow
    ? (endEvent?.data?.[EventAttributes.FLOW_END_REASON] as contentEndReason)
    : (endEvent?.data?.[EventAttributes.CHECKLIST_END_REASON] as contentEndReason);

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
  if (mode.isSimpleExport) {
    return ['Version', 'Started at (UTC)', ...(mode.isLauncherContent ? ['Activated'] : [])];
  }

  return [
    'Version',
    'Started at (UTC)',
    'Last activity at (UTC)',
    'Completed at (UTC)',
    'Progress',
    'State',
    ...((contentType === ContentDataType.FLOW || contentType === ContentDataType.CHECKLIST
      ? ['Start reason', 'End reason']
      : []) as string[]),
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
    if (event.data?.[EventAttributes.QUESTION_CVID]) {
      questionAnswers.set(event.data[EventAttributes.QUESTION_CVID], getQuestionAnswer(event));
    }
  }

  return questionAnswers;
};

const buildStepViews = (events: BizEvent[], stepHeaders: Map<string, string>) => {
  const stepViews = new Map<string, number>();

  for (const stepNumber of stepHeaders.keys()) {
    const stepIndex = Number.parseInt(stepNumber, 10);
    const viewCount = events.filter(
      (event) =>
        event.event?.codeName === BizEvents.FLOW_STEP_SEEN &&
        event.data?.[EventAttributes.FLOW_STEP_NUMBER] === stepIndex,
    ).length;

    stepViews.set(stepNumber, viewCount);
  }

  return stepViews;
};

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
  sessions: BizSession[];
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
    const includeReasonColumns =
      contentType === ContentDataType.FLOW || contentType === ContentDataType.CHECKLIST;

    const questionAnswers = buildQuestionAnswers(events);
    const stepViews = buildStepViews(events, headerContext.stepHeaders);
    const checklistCompletedTaskIds = buildChecklistCompletedTaskIds(events);

    const baseRow = [
      session.bizUser?.externalId || '',
      session.bizUser?.data?.name || '',
      session.bizUser?.data?.email || '',
    ];

    const userAttributeValues = userAttributes.map((attr) => {
      const value = session.bizUser?.data?.[attr.codeName];
      return typeof value === 'string' ? value : JSON.stringify(value || '');
    });

    const companies = session.bizUser?.bizUsersOnCompany || [];
    const companyValues = Array.from({ length: maxCompanies }, (_, i) => {
      const company = companies[i];
      return [company?.bizCompany?.externalId || '', company?.bizCompany?.data?.name || ''];
    }).flat();

    const activatedCount = events.filter(
      (event) => event.event?.codeName === BizEvents.LAUNCHER_ACTIVATED,
    ).length;

    const commonInfo = mode.isSimpleExport
      ? [
          `v${session.version?.sequence}`,
          formatUTCDate(session.createdAt),
          ...(mode.isLauncherContent ? [activatedCount] : []),
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
