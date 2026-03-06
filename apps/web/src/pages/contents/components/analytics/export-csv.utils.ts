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

const formatUTCDate = (date: string | null | undefined) => {
  if (!date) return '';
  try {
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
  } catch (_) {
    return '';
  }
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
  const { bizEvent } = session;
  if (!bizEvent || bizEvent.length === 0) {
    return '';
  }

  if (contentType === ContentDataType.CHECKLIST) {
    return getLatestEventCreatedAt(bizEvent, [BizEvents.CHECKLIST_COMPLETED]);
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return getLatestEventCreatedAt(bizEvent, [BizEvents.LAUNCHER_ACTIVATED]);
  }
  if (contentType === ContentDataType.BANNER) {
    return getLatestEventCreatedAt(bizEvent, [BizEvents.BANNER_DISMISSED]);
  }
  return getLatestEventCreatedAt(bizEvent, [BizEvents.FLOW_COMPLETED]);
};

const getState = (session: BizSession, contentType?: ContentDataType) => {
  const { bizEvent } = session;
  if (!bizEvent || bizEvent.length === 0) {
    if (contentType === ContentDataType.CHECKLIST) {
      return 'Active';
    }
    return 'In Progress';
  }

  if (contentType === ContentDataType.BANNER) {
    const isDismissed = !!bizEvent.find((e) => e.event?.codeName === BizEvents.BANNER_DISMISSED);
    const isSeen = !!bizEvent.find((e) => e.event?.codeName === BizEvents.BANNER_SEEN);
    if (isDismissed) return 'Dismissed';
    if (isSeen) return 'Seen';
    return 'In Progress';
  }

  if (contentType === ContentDataType.LAUNCHER) {
    const isDismissed = !!bizEvent.find((e) => e.event?.codeName === BizEvents.LAUNCHER_DISMISSED);
    const isActivated = !!bizEvent.find((e) => e.event?.codeName === BizEvents.LAUNCHER_ACTIVATED);
    const isSeen = !!bizEvent.find((e) => e.event?.codeName === BizEvents.LAUNCHER_SEEN);
    if (isDismissed) return 'Dismissed';
    if (isActivated) return 'Activated';
    if (isSeen) return 'Seen';
    return 'In Progress';
  }

  if (contentType === ContentDataType.CHECKLIST) {
    const isComplete = !!bizEvent.find((e) => e.event?.codeName === BizEvents.CHECKLIST_COMPLETED);
    const isDismissed = !!bizEvent.find((e) => e.event?.codeName === BizEvents.CHECKLIST_DISMISSED);
    if (isComplete) return 'Completed';
    if (isDismissed) return 'Dismissed';
    return 'Active';
  }

  const isComplete = !!bizEvent.find((e) => e.event?.codeName === BizEvents.FLOW_COMPLETED);
  const isDismissed = !!bizEvent.find((e) => e.event?.codeName === BizEvents.FLOW_ENDED);
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

  const questionHeaders = new Map<string, string>(); // cvid -> name
  const stepHeaders = new Map<string, string>(); // step number -> name
  const checklistTaskHeaders = new Map<string, string>(); // task id -> task name

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

  const baseHeaders = ['User: ID', 'User: Name', 'User: Email'];
  const userAttributeHeaders = includeAllAttributes
    ? attributeList
        ?.filter(
          (attr) =>
            attr.bizType === AttributeBizTypes.User &&
            attr.codeName !== 'name' &&
            attr.codeName !== 'email',
        )
        .map((attr) => `User: ${attr.displayName}`) || []
    : [];

  const isBannerContent = contentType === ContentDataType.BANNER;
  const isLauncherContent = contentType === ContentDataType.LAUNCHER;
  const isChecklistContent = contentType === ContentDataType.CHECKLIST;
  const isSimpleExport = isBannerContent || isLauncherContent;

  const maxCompanies = Math.max(
    ...sessions.map((session) => session.bizUser?.bizUsersOnCompany?.length || 0),
    1,
  );
  const companyHeaders =
    maxCompanies <= 1
      ? ['Company: ID', 'Company: Name']
      : Array.from({ length: maxCompanies }, (_, i) => [
          `Company(${i + 1}): ID`,
          `Company(${i + 1}): Name`,
        ]).flat();

  const otherHeaders = isSimpleExport
    ? ['Version', 'Started at (UTC)', ...(isLauncherContent ? ['Activated'] : [])]
    : [
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

  const headers = [
    ...baseHeaders,
    ...userAttributeHeaders,
    ...companyHeaders,
    ...otherHeaders,
    ...(isSimpleExport || isChecklistContent ? [] : Array.from(questionHeaders.values())),
    ...(isSimpleExport
      ? []
      : isChecklistContent
        ? Array.from(checklistTaskHeaders.values())
        : Array.from(stepHeaders.values())),
  ];

  const rows = sessions.map((session) => {
    const events = session.bizEvent || [];
    const questionAnswers = new Map<string, string>();
    const stepViews = new Map<string, number>();
    const { startReason, endReason } = getSessionReasons(events, contentType);
    const includeReasonColumns =
      contentType === ContentDataType.FLOW || contentType === ContentDataType.CHECKLIST;

    for (const event of events) {
      if (event.data?.[EventAttributes.QUESTION_CVID]) {
        questionAnswers.set(event.data[EventAttributes.QUESTION_CVID], getQuestionAnswer(event));
      }
    }

    for (const stepNumber of stepHeaders.keys()) {
      const viewCount = events.filter(
        (event) =>
          event.event?.codeName === BizEvents.FLOW_STEP_SEEN &&
          event.data?.[EventAttributes.FLOW_STEP_NUMBER] === Number.parseInt(stepNumber),
      ).length;
      stepViews.set(stepNumber, viewCount);
    }

    const baseRow = [
      session.bizUser?.externalId || '',
      session.bizUser?.data?.name || '',
      session.bizUser?.data?.email || '',
    ];

    const userAttributeValues = includeAllAttributes
      ? attributeList
          ?.filter(
            (attr) =>
              attr.bizType === AttributeBizTypes.User &&
              attr.codeName !== 'name' &&
              attr.codeName !== 'email',
          )
          .map((attr) => {
            const value = session.bizUser?.data?.[attr.codeName];
            return typeof value === 'string' ? value : JSON.stringify(value || '');
          }) || []
      : [];

    const companies = session.bizUser?.bizUsersOnCompany || [];
    const companyValues = Array.from({ length: maxCompanies }, (_, i) => {
      const company = companies[i];
      return [company?.bizCompany?.externalId || '', company?.bizCompany?.data?.name || ''];
    }).flat();

    const activatedCount = events.filter(
      (event) => event.event?.codeName === BizEvents.LAUNCHER_ACTIVATED,
    ).length;

    const commonInfo = isSimpleExport
      ? [
          `v${session.version?.sequence}`,
          formatUTCDate(session.createdAt),
          ...(isLauncherContent ? [activatedCount] : []),
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

    const questionAnswersRow =
      isSimpleExport || isChecklistContent
        ? []
        : Array.from(questionHeaders.keys()).map((cvid) => questionAnswers.get(cvid) || '');

    const checklistCompletedTaskIds = new Set(
      events
        .filter((event) => event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED)
        .map((event) => String(event.data?.[EventAttributes.CHECKLIST_TASK_ID] ?? '')),
    );

    const stepViewsRow = isSimpleExport
      ? []
      : isChecklistContent
        ? Array.from(checklistTaskHeaders.keys()).map((taskId) =>
            checklistCompletedTaskIds.has(taskId) ? '✔' : '',
          )
        : Array.from(stepHeaders.keys()).map((stepNumber) => stepViews.get(stepNumber) || 0);

    return [
      ...baseRow,
      ...userAttributeValues,
      ...companyValues,
      ...commonInfo,
      ...questionAnswersRow,
      ...stepViewsRow,
    ];
  });

  const csvContent = [
    headers.map(toCSVCell).join(','),
    ...rows.map((row) => row.map(toCSVCell).join(',')),
  ].join('\n');

  const safeContentName = sanitizeContentName(contentName);
  const fromDate = dateRange?.from ? formatLocalDateForFilename(dateRange.from) : 'all';
  const toDate = dateRange?.to ? formatLocalDateForFilename(dateRange.to) : 'all';
  const filename = `Usertour-${safeContentName}-sessions-${fromDate}_to_${toDate}.csv`;

  return {
    headers,
    rows,
    csvContent,
    filename,
  };
};
