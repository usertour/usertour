import { AttributeBizType, AttributeDataType } from '@/attributes/models/attribute.model';
import { InitThemeInput } from '@/themes/dto/theme.input';
import { Attribute, Prisma } from '@prisma/client';
import { BizEvents, CompanyAttributes, EventAttributes, UserAttributes } from '../consts/attribute';

export const initializationThemes: InitThemeInput[] = [
  {
    name: 'Standard Light',
    settings: {
      font: {
        fontSize: 14,
        linkColor: '#7ed321',
        fontFamily: 'System font',
        h1FontSize: 18,
        h2FontSize: 24,
        lineHeight: 20,
        fontWeightBold: 500,
        fontWeightNormal: 300,
      },
      modal: { width: 500, padding: 10 },
      border: {
        borderColor: '#50e3c2',
        borderWidth: 1,
        borderRadius: '8',
        borderWidthEnabled: false,
      },
      buttons: {
        height: 24,
        px: 4,
        primary: {
          border: {
            color: {
              color: '#417505',
              hover: '#7ed321',
              active: '#9013fe',
              background: '#FFFFFF',
            },
            enabled: false,
            borderWidth: 1,
          },
          textColor: {
            color: 'Auto',
            hover: 'Auto',
            active: 'Auto',
            background: '#FFFFFF',
          },
          fontWeight: 400,
          backgroundColor: {
            color: '#FFFFFF',
            hover: 'Auto',
            active: 'Auto',
            background: 'Auto',
          },
        },
        minWidth: 80,
        secondary: {
          border: {
            color: {
              color: 'Auto',
              hover: 'Auto',
              active: 'Auto',
              background: '#FFFFFF',
            },
            enabled: true,
            borderWidth: 1,
          },
          textColor: {
            color: 'Auto',
            hover: 'Auto',
            active: 'Auto',
            background: '#FFFFFF',
          },
          fontWeight: 400,
          backgroundColor: {
            color: '#FFFFFF',
            hover: 'Auto',
            active: 'Auto',
            background: 'Auto',
          },
        },
        borderRadius: 3,
      },
      tooltip: { width: 300, notchSize: 20 },
      xbutton: { color: 'Auto' },
      progress: {
        color: 'Auto',
        height: 2,
      },
      checklist: {
        width: 360,
        zIndex: 1000,
        placement: {
          position: 'rightBottom',
          positionOffsetX: 100,
          positionOffsetY: 20,
        },
        checkmarkColor: '#1d4ed8',
      },
      checklistLauncher: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: 'Auto',
        },
        height: 48,
        counter: {
          color: 'Auto',
          background: 'Auto',
        },
        placement: {
          position: 'rightBottom',
          positionOffsetX: 100,
          positionOffsetY: 20,
        },
        fontWeight: 400,
        borderRadius: 24,
      },
      backdrop: {
        color: '#020617',
        opacity: 18,
        highlight: {
          type: 'inside',
          color: '#8b572a',
          radius: 3,
          spread: 3,
          opacity: 10,
        },
      },
      mainColor: {
        color: '#020617',
        hover: 'Auto',
        active: 'Auto',
        autoHover: '#ffffff',
        autoActive: '#ffffff',
        background: '#FFFFFF',
      },
      brandColor: {
        color: '#f8fafc',
        hover: 'Auto',
        active: 'Auto',
        autoHover: '#3162ec',
        autoActive: '#4576ff',
        background: '#1d4ed8',
      },
    },
    isDefault: true,
    isSystem: true,
  },
  {
    name: 'Standard Dark',
    settings: {
      font: {
        fontSize: 14,
        linkColor: '#7ed321',
        fontFamily: 'System font',
        h1FontSize: 18,
        h2FontSize: 24,
        lineHeight: 20,
        fontWeightBold: 500,
        fontWeightNormal: 300,
      },
      modal: { width: 500, padding: 10 },
      border: {
        borderColor: '#50e3c2',
        borderWidth: 1,
        borderRadius: '8',
        borderWidthEnabled: false,
      },
      buttons: {
        height: 24,
        px: 4,
        primary: {
          border: {
            color: {
              color: '#417505',
              hover: '#7ed321',
              active: '#9013fe',
              background: '#FFFFFF',
            },
            enabled: false,
            borderWidth: 1,
          },
          textColor: {
            color: 'Auto',
            hover: 'Auto',
            active: 'Auto',
            background: '#FFFFFF',
          },
          fontWeight: 400,
          backgroundColor: {
            color: '#FFFFFF',
            hover: 'Auto',
            active: 'Auto',
            background: 'Auto',
          },
        },
        minWidth: 80,
        secondary: {
          border: {
            color: {
              color: 'Auto',
              hover: 'Auto',
              active: 'Auto',
              background: '#FFFFFF',
            },
            enabled: true,
            borderWidth: 1,
          },
          textColor: {
            color: 'Auto',
            hover: 'Auto',
            active: 'Auto',
            background: '#FFFFFF',
          },
          fontWeight: 400,
          backgroundColor: {
            color: '#FFFFFF',
            hover: 'Auto',
            active: 'Auto',
            background: 'Auto',
          },
        },
        borderRadius: 3,
      },
      tooltip: { width: 300, notchSize: 20 },
      xbutton: { color: 'Auto' },
      progress: {
        color: 'Auto',
        height: 2,
      },
      checklist: {
        width: 360,
        zIndex: 1000,
        placement: {
          position: 'rightBottom',
          positionOffsetX: 100,
          positionOffsetY: 20,
        },
        checkmarkColor: '#1d4ed8',
      },
      checklistLauncher: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: 'Auto',
        },
        height: 48,
        counter: {
          color: 'Auto',
          background: 'Auto',
        },
        placement: {
          position: 'rightBottom',
          positionOffsetX: 100,
          positionOffsetY: 20,
        },
        fontWeight: 400,
        borderRadius: 24,
      },
      backdrop: {
        color: '#020617',
        opacity: 18,
        highlight: {
          type: 'inside',
          color: '#8b572a',
          radius: 3,
          spread: 3,
          opacity: 10,
        },
      },
      mainColor: {
        color: '#f8fafc',
        hover: 'Auto',
        active: 'Auto',
        autoHover: '#161a2b',
        autoActive: '#2a2e3f',
        background: '#020617',
      },
      brandColor: {
        color: '#f8fafc',
        hover: 'Auto',
        active: 'Auto',
        autoHover: '#3162ec',
        autoActive: '#4576ff',
        background: '#1d4ed8',
      },
    },
    isDefault: false,
    isSystem: true,
  },
];

const defaultEvents = [
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
    displayName: 'Question Answered',
    codeName: BizEvents.QUESTION_ANSWERED,
    attributes: [
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
    description: "User's email address",
  },
  {
    codeName: UserAttributes.NAME,
    displayName: 'Name',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.String,
    description: "User's full name",
  },
  {
    codeName: UserAttributes.FIRST_SEEN_AT,
    displayName: 'First Seen',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.DateTime,
    description: 'When user was first seen by Usertour',
  },
  {
    codeName: UserAttributes.LAST_SEEN_AT,
    displayName: 'Last Seen',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.DateTime,
    description: 'When user was last seen by Usertour',
  },
  {
    codeName: UserAttributes.SIGNED_UP_AT,
    displayName: 'Signed Up',
    bizType: AttributeBizType.USER,
    dataType: AttributeDataType.DateTime,
    description: 'When user first signed up in your app',
  },
  {
    codeName: CompanyAttributes.NAME,
    displayName: 'Company Name',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.String,
    description: "Company's name",
  },
  {
    codeName: CompanyAttributes.FIRST_SEEN_AT,
    displayName: 'Company First Seen',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.DateTime,
    description: 'When a member of the company was first seen by Usertour',
  },
  {
    codeName: CompanyAttributes.LAST_SEEN_AT,
    displayName: 'Company Last Seen',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.DateTime,
    description: 'When a member of the company was last seen by Usertour',
  },
  {
    codeName: CompanyAttributes.SIGNED_UP_AT,
    displayName: 'Company Signed Up',
    bizType: AttributeBizType.COMPANY,
    dataType: AttributeDataType.DateTime,
    description: 'When the company was first signed up in your app',
  },
  {
    codeName: EventAttributes.FLOW_ID,
    displayName: 'Flow ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour flow id',
  },
  {
    codeName: EventAttributes.FLOW_NAME,
    displayName: 'Flow Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour flow name',
  },
  {
    codeName: EventAttributes.FLOW_SESSION_ID,
    displayName: 'Flow Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'A session of a specific user viewing a specific flow',
  },
  {
    codeName: EventAttributes.FLOW_START_REASON,
    displayName: 'Flow Start Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Describes why a flow started',
  },
  {
    codeName: EventAttributes.FLOW_END_REASON,
    displayName: 'Flow End Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Describes why a flow ended',
  },
  {
    codeName: EventAttributes.FLOW_STEP_ID,
    displayName: 'Flow Step ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour flow step id',
  },
  {
    codeName: EventAttributes.FLOW_STEP_CVID,
    displayName: 'Flow Step CVID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour flow step cvid',
  },
  {
    codeName: EventAttributes.FLOW_STEP_NAME,
    displayName: 'Flow Step Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour flow step name',
  },
  {
    codeName: EventAttributes.FLOW_STEP_NUMBER,
    displayName: 'Flow Step Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Usertour flow step number',
  },
  {
    codeName: EventAttributes.FLOW_STEP_PROGRESS,
    displayName: 'Flow Step Progress',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Usertour flow step progress (% towards goal step)',
  },
  {
    codeName: EventAttributes.FLOW_VERSION_ID,
    displayName: 'Flow Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour flow version id',
  },
  {
    codeName: EventAttributes.FLOW_VERSION_NUMBER,
    displayName: 'Flow Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Usertour flow version number',
  },
  {
    codeName: EventAttributes.LAUNCHER_ID,
    displayName: 'Launcher ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour launcher id',
  },
  {
    codeName: EventAttributes.LAUNCHER_NAME,
    displayName: 'Launcher Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour launcher name',
  },
  {
    codeName: EventAttributes.LAUNCHER_SESSION_ID,
    displayName: 'Launcher Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'A session of a specific user viewing a specific launcher',
  },
  {
    codeName: EventAttributes.LAUNCHER_VERSION_ID,
    displayName: 'Launcher Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour launcher version',
  },
  {
    codeName: EventAttributes.LAUNCHER_VERSION_NUMBER,
    displayName: 'Launcher Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Usertour launcher version number',
  },
  {
    codeName: EventAttributes.CHECKLIST_ID,
    displayName: 'Checklist ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour checklist id',
  },
  {
    codeName: EventAttributes.CHECKLIST_NAME,
    displayName: 'Checklist Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour checklist name',
  },
  {
    codeName: EventAttributes.CHECKLIST_SESSION_ID,
    displayName: 'Checklist Session ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'A session of a specific user viewing a specific checklist',
  },
  {
    codeName: EventAttributes.CHECKLIST_VERSION_ID,
    displayName: 'Checklist Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour checklist version',
  },
  {
    codeName: EventAttributes.CHECKLIST_VERSION_NUMBER,
    displayName: 'Checklist Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Usertour checklist version number',
  },
  {
    codeName: EventAttributes.CHECKLIST_END_REASON,
    displayName: 'Checklist End Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Describes why a checklist ended',
  },
  {
    codeName: EventAttributes.CHECKLIST_START_REASON,
    displayName: 'Checklist Start Reason',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Describes why a checklist started',
  },
  {
    codeName: EventAttributes.CHECKLIST_TASK_CVID,
    displayName: 'Checklist Task CVID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description:
      'Usertour checklist task Cross-Version ID (a pseudo-ID that does not change across versions)',
  },
  {
    codeName: EventAttributes.CHECKLIST_TASK_ID,
    displayName: 'Checklist Task ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour checklist task id',
  },
  {
    codeName: EventAttributes.CHECKLIST_TASK_NAME,
    displayName: 'Checklist Task Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour checklist task name',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_ID,
    displayName: 'Event Tracker ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour event tracker id',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_NAME,
    displayName: 'Event Tracker Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour event tracker name',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_VERSION_ID,
    displayName: 'Event Tracker Version ID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Usertour event tracker version',
  },
  {
    codeName: EventAttributes.EVENT_TRACKER_VERSION_NUMBER,
    displayName: 'Event Tracker Version Number',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'Usertour event tracker version number',
  },
  {
    codeName: EventAttributes.LIST_ANSWER,
    displayName: 'List Answer',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.List,
    description: 'The selected answer from a list of options',
  },
  {
    codeName: EventAttributes.NUMBER_ANSWER,
    displayName: 'Number Answer',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'The numeric answer provided',
  },
  {
    codeName: EventAttributes.TEXT_ANSWER,
    displayName: 'Text Answer',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'The text answer provided',
  },
  {
    codeName: EventAttributes.LOCALE_CODE,
    displayName: 'Locale Code',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'The locale/language code for the content',
  },
  {
    codeName: EventAttributes.PAGE_URL,
    displayName: 'Page URL',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'The URL of the page where the event occurred',
  },
  {
    codeName: EventAttributes.VIEWPORT_HEIGHT,
    displayName: 'Viewport Height',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'The height of the browser viewport in pixels',
  },
  {
    codeName: EventAttributes.VIEWPORT_WIDTH,
    displayName: 'Viewport Width',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.Number,
    description: 'The width of the browser viewport in pixels',
  },
  {
    codeName: EventAttributes.QUESTION_CVID,
    displayName: 'Question CVID',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'Question Cross-Version ID (a pseudo-ID that does not change across versions)',
  },
  {
    codeName: EventAttributes.QUESTION_NAME,
    displayName: 'Question Name',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'The name of the question',
  },
  {
    codeName: EventAttributes.QUESTION_TYPE,
    displayName: 'Question Type',
    bizType: AttributeBizType.EVENT,
    dataType: AttributeDataType.String,
    description: 'The type of the question',
  },
];

const initializationAttributes = async (tx: Prisma.TransactionClient, projectId: string) => {
  const predefined = true;

  // Get existing attributes
  const existingAttributes = await tx.attribute.findMany({
    where: { projectId, predefined: true },
    select: { codeName: true },
  });
  const existingCodeNames = new Set(existingAttributes.map((a) => a.codeName));

  // Filter out existing attributes
  const newAttributes = defaultAttributes.filter((attr) => !existingCodeNames.has(attr.codeName));

  if (newAttributes.length > 0) {
    return await tx.attribute.createMany({
      data: newAttributes.map((attr) => ({ ...attr, projectId, predefined })),
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
