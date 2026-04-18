import { AttributeBizType, AttributeDataType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { InitThemeInput } from '@/themes/dto/theme.input';
import { Attribute, Prisma } from '@prisma/client';
import {
  BizEvents,
  ColumnSetting,
  EventAttributes,
  UserAttributes,
  CompanyAttributes,
  defaultSettings,
  standardDarkSettings,
} from '@usertour/types';

export const initializationThemes: InitThemeInput[] = [
  {
    name: 'Standard Light',
    settings: { ...defaultSettings },
    isDefault: true,
    isSystem: true,
  },
  {
    name: 'Standard Dark',
    settings: { ...standardDarkSettings },
    isDefault: false,
    isSystem: true,
  },
];

export const defaultEvents = [
  {
    displayName: 'Page Viewed',
    codeName: BizEvents.PAGE_VIEWED,
    attributes: [
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Flow Started',
    codeName: BizEvents.FLOW_STARTED,
    attributes: [
      EventAttributes.FLOW_ID,
      EventAttributes.FLOW_NAME,
      EventAttributes.FLOW_SESSION_ID,
      EventAttributes.FLOW_START_REASON,
      EventAttributes.FLOW_VERSION_ID,
      EventAttributes.FLOW_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Flow Dismissed/Ended',
    codeName: BizEvents.FLOW_ENDED,
    attributes: [
      EventAttributes.FLOW_END_REASON,
      EventAttributes.FLOW_ID,
      EventAttributes.FLOW_NAME,
      EventAttributes.FLOW_SESSION_ID,
      EventAttributes.FLOW_STEP_CVID,
      EventAttributes.FLOW_STEP_ID,
      EventAttributes.FLOW_STEP_NAME,
      EventAttributes.FLOW_STEP_NUMBER,
      EventAttributes.FLOW_STEP_PROGRESS,
      EventAttributes.FLOW_VERSION_ID,
      EventAttributes.FLOW_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Flow Step Seen',
    codeName: BizEvents.FLOW_STEP_SEEN,
    attributes: [
      EventAttributes.FLOW_ID,
      EventAttributes.FLOW_NAME,
      EventAttributes.FLOW_SESSION_ID,
      EventAttributes.FLOW_STEP_CVID,
      EventAttributes.FLOW_STEP_ID,
      EventAttributes.FLOW_STEP_NAME,
      EventAttributes.FLOW_STEP_NUMBER,
      EventAttributes.FLOW_STEP_PROGRESS,
      EventAttributes.FLOW_VERSION_ID,
      EventAttributes.FLOW_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Flow Step Completed',
    codeName: BizEvents.FLOW_STEP_COMPLETED,
    attributes: [
      EventAttributes.FLOW_ID,
      EventAttributes.FLOW_NAME,
      EventAttributes.FLOW_SESSION_ID,
      EventAttributes.FLOW_STEP_CVID,
      EventAttributes.FLOW_STEP_ID,
      EventAttributes.FLOW_STEP_NAME,
      EventAttributes.FLOW_STEP_NUMBER,
      EventAttributes.FLOW_STEP_PROGRESS,
      EventAttributes.FLOW_VERSION_ID,
      EventAttributes.FLOW_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Flow Completed',
    codeName: BizEvents.FLOW_COMPLETED,
    attributes: [
      EventAttributes.FLOW_ID,
      EventAttributes.FLOW_NAME,
      EventAttributes.FLOW_SESSION_ID,
      EventAttributes.FLOW_STEP_CVID,
      EventAttributes.FLOW_STEP_ID,
      EventAttributes.FLOW_STEP_NAME,
      EventAttributes.FLOW_STEP_NUMBER,
      EventAttributes.FLOW_STEP_PROGRESS,
      EventAttributes.FLOW_VERSION_ID,
      EventAttributes.FLOW_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Tooltip Target Missing',
    codeName: BizEvents.TOOLTIP_TARGET_MISSING,
    attributes: [
      EventAttributes.FLOW_ID,
      EventAttributes.FLOW_NAME,
      EventAttributes.FLOW_SESSION_ID,
      EventAttributes.FLOW_STEP_CVID,
      EventAttributes.FLOW_STEP_ID,
      EventAttributes.FLOW_STEP_NAME,
      EventAttributes.FLOW_STEP_NUMBER,
      EventAttributes.FLOW_STEP_PROGRESS,
      EventAttributes.FLOW_VERSION_ID,
      EventAttributes.FLOW_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Launcher Activated',
    codeName: BizEvents.LAUNCHER_ACTIVATED,
    attributes: [
      EventAttributes.LAUNCHER_ID,
      EventAttributes.LAUNCHER_NAME,
      EventAttributes.LAUNCHER_SESSION_ID,
      EventAttributes.LAUNCHER_VERSION_ID,
      EventAttributes.LAUNCHER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Launcher Dismissed',
    codeName: BizEvents.LAUNCHER_DISMISSED,
    attributes: [
      EventAttributes.LAUNCHER_ID,
      EventAttributes.LAUNCHER_NAME,
      EventAttributes.LAUNCHER_SESSION_ID,
      EventAttributes.LAUNCHER_VERSION_ID,
      EventAttributes.LAUNCHER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Launcher Seen',
    codeName: BizEvents.LAUNCHER_SEEN,
    attributes: [
      EventAttributes.LAUNCHER_ID,
      EventAttributes.LAUNCHER_NAME,
      EventAttributes.LAUNCHER_SESSION_ID,
      EventAttributes.LAUNCHER_VERSION_ID,
      EventAttributes.LAUNCHER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Banner Seen',
    codeName: BizEvents.BANNER_SEEN,
    attributes: [
      EventAttributes.BANNER_ID,
      EventAttributes.BANNER_NAME,
      EventAttributes.BANNER_SESSION_ID,
      EventAttributes.BANNER_VERSION_ID,
      EventAttributes.BANNER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Banner Dismissed',
    codeName: BizEvents.BANNER_DISMISSED,
    attributes: [
      EventAttributes.BANNER_ID,
      EventAttributes.BANNER_NAME,
      EventAttributes.BANNER_SESSION_ID,
      EventAttributes.BANNER_VERSION_ID,
      EventAttributes.BANNER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Resource Center Opened',
    codeName: BizEvents.RESOURCE_CENTER_OPENED,
    attributes: [
      EventAttributes.RESOURCE_CENTER_ID,
      EventAttributes.RESOURCE_CENTER_NAME,
      EventAttributes.RESOURCE_CENTER_SESSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Resource Center Closed',
    codeName: BizEvents.RESOURCE_CENTER_CLOSED,
    attributes: [
      EventAttributes.RESOURCE_CENTER_ID,
      EventAttributes.RESOURCE_CENTER_NAME,
      EventAttributes.RESOURCE_CENTER_SESSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Resource Center Clicked',
    codeName: BizEvents.RESOURCE_CENTER_CLICKED,
    attributes: [
      EventAttributes.RESOURCE_CENTER_ID,
      EventAttributes.RESOURCE_CENTER_NAME,
      EventAttributes.RESOURCE_CENTER_SESSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_NUMBER,
      EventAttributes.RESOURCE_CENTER_TAB_ID,
      EventAttributes.RESOURCE_CENTER_TAB_NAME,
      EventAttributes.RESOURCE_CENTER_BLOCK_ID,
      EventAttributes.RESOURCE_CENTER_BLOCK_NAME,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Resource Center Dismissed',
    codeName: BizEvents.RESOURCE_CENTER_DISMISSED,
    attributes: [
      EventAttributes.RESOURCE_CENTER_ID,
      EventAttributes.RESOURCE_CENTER_NAME,
      EventAttributes.RESOURCE_CENTER_SESSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_ID,
      EventAttributes.RESOURCE_CENTER_VERSION_NUMBER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Question Answered',
    codeName: BizEvents.QUESTION_ANSWERED,
    attributes: [
      EventAttributes.FLOW_ID,
      EventAttributes.FLOW_NAME,
      EventAttributes.FLOW_VERSION_ID,
      EventAttributes.FLOW_VERSION_NUMBER,
      EventAttributes.LIST_ANSWER,
      EventAttributes.NUMBER_ANSWER,
      EventAttributes.QUESTION_CVID,
      EventAttributes.QUESTION_NAME,
      EventAttributes.QUESTION_TYPE,
      EventAttributes.TEXT_ANSWER,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Checklist Completed',
    codeName: BizEvents.CHECKLIST_COMPLETED,
    attributes: [
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
      EventAttributes.CHECKLIST_ID,
      EventAttributes.CHECKLIST_NAME,
      EventAttributes.CHECKLIST_SESSION_ID,
      EventAttributes.CHECKLIST_VERSION_ID,
      EventAttributes.CHECKLIST_VERSION_NUMBER,
    ],
  },
  {
    displayName: 'Checklist Dismissed/Ended',
    codeName: BizEvents.CHECKLIST_DISMISSED,
    attributes: [
      EventAttributes.CHECKLIST_END_REASON,
      EventAttributes.LOCALE_CODE,
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
      EventAttributes.CHECKLIST_VERSION_NUMBER,
      EventAttributes.CHECKLIST_ID,
      EventAttributes.CHECKLIST_NAME,
      EventAttributes.CHECKLIST_SESSION_ID,
      EventAttributes.CHECKLIST_VERSION_ID,
    ],
  },
  {
    displayName: 'Checklist Hidden',
    codeName: BizEvents.CHECKLIST_HIDDEN,
    attributes: [
      EventAttributes.CHECKLIST_VERSION_NUMBER,
      EventAttributes.CHECKLIST_NAME,
      EventAttributes.CHECKLIST_ID,
      EventAttributes.CHECKLIST_SESSION_ID,
      EventAttributes.CHECKLIST_VERSION_ID,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
      EventAttributes.PAGE_URL,
      EventAttributes.LOCALE_CODE,
    ],
  },
  {
    displayName: 'Checklist Shown',
    codeName: BizEvents.CHECKLIST_SEEN,
    attributes: [
      EventAttributes.PAGE_URL,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.LOCALE_CODE,
      EventAttributes.CHECKLIST_ID,
      EventAttributes.CHECKLIST_VERSION_NUMBER,
      EventAttributes.CHECKLIST_SESSION_ID,
      EventAttributes.CHECKLIST_VERSION_ID,
      EventAttributes.CHECKLIST_NAME,
      EventAttributes.VIEWPORT_WIDTH,
    ],
  },
  {
    displayName: 'Checklist Started',
    codeName: BizEvents.CHECKLIST_STARTED,
    attributes: [
      EventAttributes.VIEWPORT_WIDTH,
      EventAttributes.LOCALE_CODE,
      EventAttributes.CHECKLIST_VERSION_NUMBER,
      EventAttributes.CHECKLIST_VERSION_ID,
      EventAttributes.CHECKLIST_START_REASON,
      EventAttributes.CHECKLIST_SESSION_ID,
      EventAttributes.CHECKLIST_NAME,
      EventAttributes.CHECKLIST_ID,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.PAGE_URL,
    ],
  },
  {
    displayName: 'Checklist Task Clicked',
    codeName: BizEvents.CHECKLIST_TASK_CLICKED,
    attributes: [
      EventAttributes.CHECKLIST_SESSION_ID,
      EventAttributes.CHECKLIST_NAME,
      EventAttributes.CHECKLIST_TASK_ID,
      EventAttributes.CHECKLIST_TASK_CVID,
      EventAttributes.CHECKLIST_ID,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
      EventAttributes.PAGE_URL,
      EventAttributes.LOCALE_CODE,
      EventAttributes.CHECKLIST_VERSION_NUMBER,
      EventAttributes.CHECKLIST_VERSION_ID,
      EventAttributes.CHECKLIST_TASK_NAME,
    ],
  },
  {
    displayName: 'Checklist Task Completed',
    codeName: BizEvents.CHECKLIST_TASK_COMPLETED,
    attributes: [
      EventAttributes.PAGE_URL,
      EventAttributes.CHECKLIST_VERSION_NUMBER,
      EventAttributes.CHECKLIST_VERSION_ID,
      EventAttributes.CHECKLIST_TASK_NAME,
      EventAttributes.CHECKLIST_TASK_ID,
      EventAttributes.CHECKLIST_TASK_CVID,
      EventAttributes.CHECKLIST_ID,
      EventAttributes.CHECKLIST_SESSION_ID,
      EventAttributes.CHECKLIST_NAME,
      EventAttributes.VIEWPORT_HEIGHT,
      EventAttributes.VIEWPORT_WIDTH,
      EventAttributes.LOCALE_CODE,
    ],
  },
];

const defaultAttributes: Partial<Attribute>[] = [
  {
    codeName: UserAttributes.EMAIL,
    displayName: 'Email',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.String,
    description: 'Email address belonging to the user',
  },
  {
    codeName: UserAttributes.NAME,
    displayName: 'Name',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.String,
    description: 'Full name of the user',
  },
  {
    codeName: UserAttributes.FIRST_SEEN_AT,
    displayName: 'First Seen',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.DateTime,
    description: 'When the user first interacted with Usertour',
  },
  {
    codeName: UserAttributes.LAST_SEEN_AT,
    displayName: 'Last Seen',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.DateTime,
    description: 'When the user most recently interacted with Usertour',
  },
  {
    codeName: UserAttributes.SIGNED_UP_AT,
    displayName: 'Signed Up',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.DateTime,
    description: 'When the user first signed up to your app',
  },
  {
    codeName: CompanyAttributes.NAME,
    displayName: 'Company Name',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.String,
    description: 'Name of the company',
  },
  {
    codeName: CompanyAttributes.FIRST_SEEN_AT,
    displayName: 'Company First Seen',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.DateTime,
    description: 'When any member of the company first appeared in Usertour',
  },
  {
    codeName: CompanyAttributes.LAST_SEEN_AT,
    displayName: 'Company Last Seen',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.DateTime,
    description: 'When any member of the company most recently appeared in Usertour',
  },
  {
    codeName: CompanyAttributes.SIGNED_UP_AT,
    displayName: 'Company Signed Up',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.DateTime,
    description: 'When the company first signed up to your app',
  },
  {
    codeName: EventAttributes.FLOW_ID,
    displayName: 'Flow ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour flow',
  },
  {
    codeName: EventAttributes.FLOW_NAME,
    displayName: 'Flow Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour flow',
  },
  {
    codeName: EventAttributes.FLOW_SESSION_ID,
    displayName: 'Flow Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: "A user's session viewing this flow",
  },
  {
    codeName: EventAttributes.FLOW_START_REASON,
    displayName: 'Flow Start Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Why the flow started',
  },
  {
    codeName: EventAttributes.FLOW_END_REASON,
    displayName: 'Flow End Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Why the flow ended',
  },
  {
    codeName: EventAttributes.FLOW_STEP_ID,
    displayName: 'Flow Step ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour flow step',
  },
  {
    codeName: EventAttributes.FLOW_STEP_CVID,
    displayName: 'Flow Step CVID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Cross-version identifier of the Usertour flow step',
  },
  {
    codeName: EventAttributes.FLOW_STEP_NAME,
    displayName: 'Flow Step Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour flow step',
  },
  {
    codeName: EventAttributes.FLOW_STEP_NUMBER,
    displayName: 'Flow Step Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Position of the Usertour flow step',
  },
  {
    codeName: EventAttributes.FLOW_STEP_PROGRESS,
    displayName: 'Flow Step Progress',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Progress percentage of the Usertour flow step toward its goal',
  },
  {
    codeName: EventAttributes.FLOW_VERSION_ID,
    displayName: 'Flow Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour flow version',
  },
  {
    codeName: EventAttributes.FLOW_VERSION_NUMBER,
    displayName: 'Flow Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Number of the Usertour flow version',
  },
  {
    codeName: EventAttributes.LAUNCHER_ID,
    displayName: 'Launcher ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour launcher',
  },
  {
    codeName: EventAttributes.LAUNCHER_NAME,
    displayName: 'Launcher Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour launcher',
  },
  {
    codeName: EventAttributes.LAUNCHER_SESSION_ID,
    displayName: 'Launcher Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: "A user's session viewing this launcher",
  },
  {
    codeName: EventAttributes.LAUNCHER_VERSION_ID,
    displayName: 'Launcher Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour launcher version',
  },
  {
    codeName: EventAttributes.LAUNCHER_VERSION_NUMBER,
    displayName: 'Launcher Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Number of the Usertour launcher version',
  },
  {
    codeName: EventAttributes.BANNER_ID,
    displayName: 'Banner ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour banner',
  },
  {
    codeName: EventAttributes.BANNER_NAME,
    displayName: 'Banner Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour banner',
  },
  {
    codeName: EventAttributes.BANNER_SESSION_ID,
    displayName: 'Banner Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: "A user's session viewing this banner",
  },
  {
    codeName: EventAttributes.BANNER_VERSION_ID,
    displayName: 'Banner Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour banner version',
  },
  {
    codeName: EventAttributes.BANNER_VERSION_NUMBER,
    displayName: 'Banner Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Number of the Usertour banner version',
  },
  {
    codeName: EventAttributes.CHECKLIST_ID,
    displayName: 'Checklist ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour checklist',
  },
  {
    codeName: EventAttributes.CHECKLIST_NAME,
    displayName: 'Checklist Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour checklist',
  },
  {
    codeName: EventAttributes.CHECKLIST_SESSION_ID,
    displayName: 'Checklist Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: "A user's session viewing this checklist",
  },
  {
    codeName: EventAttributes.CHECKLIST_VERSION_ID,
    displayName: 'Checklist Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour checklist version',
  },
  {
    codeName: EventAttributes.CHECKLIST_VERSION_NUMBER,
    displayName: 'Checklist Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Number of the Usertour checklist version',
  },
  {
    codeName: EventAttributes.CHECKLIST_END_REASON,
    displayName: 'Checklist End Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Why the checklist ended',
  },
  {
    codeName: EventAttributes.CHECKLIST_START_REASON,
    displayName: 'Checklist Start Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Why the checklist started',
  },
  {
    codeName: EventAttributes.CHECKLIST_TASK_CVID,
    displayName: 'Checklist Task CVID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description:
      "Stable identifier of the Usertour checklist task that doesn't change across versions",
  },
  {
    codeName: EventAttributes.CHECKLIST_TASK_ID,
    displayName: 'Checklist Task ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour checklist task',
  },
  {
    codeName: EventAttributes.CHECKLIST_TASK_NAME,
    displayName: 'Checklist Task Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour checklist task',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_ID,
    displayName: 'Resource Center ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour resource center',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_NAME,
    displayName: 'Resource Center Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour resource center',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_SESSION_ID,
    displayName: 'Resource Center Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: "A user's session viewing this resource center",
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_VERSION_ID,
    displayName: 'Resource Center Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour resource center version',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_VERSION_NUMBER,
    displayName: 'Resource Center Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Number of the Usertour resource center version',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_BLOCK_ID,
    displayName: 'Resource Center Block ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour resource center block',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_BLOCK_NAME,
    displayName: 'Resource Center Block Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour resource center block',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_TAB_ID,
    displayName: 'Resource Center Tab ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour resource center tab the block belongs to',
  },
  {
    codeName: EventAttributes.RESOURCE_CENTER_TAB_NAME,
    displayName: 'Resource Center Tab Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour resource center tab the block belongs to',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_ID,
    displayName: 'Event Tracker ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour event tracker',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_NAME,
    displayName: 'Event Tracker Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the Usertour event tracker',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_VERSION_ID,
    displayName: 'Event Tracker Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Unique identifier of the Usertour event tracker version',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_VERSION_NUMBER,
    displayName: 'Event Tracker Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Number of the Usertour event tracker version',
  },
  {
    codeName: EventAttributes.LIST_ANSWER,
    displayName: 'List Answer',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.List,
    description: 'Option(s) chosen from the available list',
  },
  {
    codeName: EventAttributes.NUMBER_ANSWER,
    displayName: 'Number Answer',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Numeric value submitted as the answer',
  },
  {
    codeName: EventAttributes.TEXT_ANSWER,
    displayName: 'Text Answer',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Text value submitted as the answer',
  },
  {
    codeName: EventAttributes.LOCALE_CODE,
    displayName: 'Locale Code',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Language/locale code associated with the content',
  },
  {
    codeName: EventAttributes.PAGE_URL,
    displayName: 'Page URL',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'URL of the page on which the event was triggered',
  },
  {
    codeName: EventAttributes.VIEWPORT_HEIGHT,
    displayName: 'Viewport Height',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Browser viewport height measured in pixels',
  },
  {
    codeName: EventAttributes.VIEWPORT_WIDTH,
    displayName: 'Viewport Width',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Browser viewport width measured in pixels',
  },
  {
    codeName: EventAttributes.QUESTION_CVID,
    displayName: 'Question CVID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: "Stable identifier of the question that doesn't change across versions",
  },
  {
    codeName: EventAttributes.QUESTION_NAME,
    displayName: 'Question Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Display name of the question',
  },
  {
    codeName: EventAttributes.QUESTION_TYPE,
    displayName: 'Question Type',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Type/category of the question',
  },
];

const initializationAttributes = async (tx: Prisma.TransactionClient, projectId: string) => {
  for (const attr of defaultAttributes) {
    await tx.attribute.upsert({
      where: {
        projectId_bizType_codeName: {
          projectId,
          bizType: attr.bizType,
          codeName: attr.codeName,
        },
      },
      create: { ...attr, projectId, predefined: true },
      update: {
        displayName: attr.displayName,
        description: attr.description,
      },
    });
  }
};

const initializationEvents = async (tx: Prisma.TransactionClient, projectId: string) => {
  const predefined = true;

  // Get existing events
  const existingEvents = await tx.event.findMany({
    where: { projectId, predefined: true },
    select: { codeName: true },
  });
  const existingCodeNames = new Set(existingEvents.map((e) => e.codeName));

  // Filter out existing events
  const newEvents = defaultEvents.filter((event) => !existingCodeNames.has(event.codeName));

  if (newEvents.length > 0) {
    return await tx.event.createMany({
      data: newEvents.map(({ displayName, codeName }) => ({
        displayName,
        codeName,
        projectId,
        predefined,
      })),
    });
  }
};

const initializationAttributeOnEvent = async (tx: Prisma.TransactionClient, projectId: string) => {
  const attributes = await tx.attribute.findMany({
    where: { bizType: AttributeBizType.EVENT, predefined: true, projectId },
  });
  const events = await tx.event.findMany({ where: { projectId } });

  // Get existing relationships
  const existingRelations = await tx.attributeOnEvent.findMany({
    where: {
      event: { projectId },
      attribute: { projectId },
    },
    select: { attributeId: true, eventId: true },
  });

  // Create a Set of existing relations for easy lookup
  const existingRelationSet = new Set(
    existingRelations.map((rel) => `${rel.attributeId}-${rel.eventId}`),
  );

  const inserts = [];
  for (const defaultEvent of defaultEvents) {
    const event = events.find((e) => e.codeName === defaultEvent.codeName);
    if (!event) continue;

    for (const attr of attributes) {
      if (defaultEvent.attributes.includes(attr.codeName as EventAttributes)) {
        const relationKey = `${attr.id}-${event.id}`;
        // Only add if relation doesn't exist
        if (!existingRelationSet.has(relationKey)) {
          inserts.push({ attributeId: attr.id, eventId: event.id });
        }
      }
    }
  }

  if (inserts.length > 0) {
    await tx.attributeOnEvent.createMany({ data: inserts });
  }
};

export const initialization = async (tx: Prisma.TransactionClient, projectId: string) => {
  await initializationAttributes(tx, projectId);
  await initializationEvents(tx, projectId);
  await initializationAttributeOnEvent(tx, projectId);
};

export interface DefaultSegmentInput {
  name: string;
  bizType: SegmentBizType;
  dataType: SegmentDataType;
  data: any[];
  columns?: ColumnSetting[];
}

/**
 * Generate default columns configuration based on segment bizType
 */
export function getDefaultColumns(bizType: SegmentBizType): ColumnSetting[] {
  if (bizType === SegmentBizType.USER) {
    return [
      { codeName: UserAttributes.EMAIL, visible: true },
      { codeName: UserAttributes.LAST_SEEN_AT, visible: true },
      { codeName: UserAttributes.SIGNED_UP_AT, visible: true },
    ];
  }
  if (bizType === SegmentBizType.COMPANY) {
    return [
      { codeName: CompanyAttributes.LAST_SEEN_AT, visible: true },
      { codeName: CompanyAttributes.SIGNED_UP_AT, visible: true },
    ];
  }
  return [];
}

/**
 * Get default segments configuration for project initialization
 */
export function getDefaultSegments(): DefaultSegmentInput[] {
  return [
    {
      name: 'All Users',
      bizType: SegmentBizType.USER,
      dataType: SegmentDataType.ALL,
      data: [],
      columns: getDefaultColumns(SegmentBizType.USER),
    },
    {
      name: 'All Companies',
      bizType: SegmentBizType.COMPANY,
      dataType: SegmentDataType.ALL,
      data: [],
      columns: getDefaultColumns(SegmentBizType.COMPANY),
    },
  ];
}
