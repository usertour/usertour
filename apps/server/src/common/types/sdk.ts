import {
  AttributeBizTypes,
  BizAttributeTypes,
  ChecklistData,
  Content,
  ContentDataType,
  contentStartReason,
  RulesCondition,
  Step,
  Theme,
} from '@usertour/types';

export type SessionAttribute = {
  id: string;
  codeName: string;
  bizType: AttributeBizTypes;
  dataType: BizAttributeTypes;
  value: any;
};

export type SessionTheme = Pick<Theme, 'settings' | 'variations'> & {
  attributes?: SessionAttribute[];
};

export type SessionStep = Step & {
  theme?: SessionTheme;
};

export type CustomContentSession = {
  id: string;
  type: ContentDataType;
  draftMode: boolean;
  attributes: SessionAttribute[];
  content: Pick<Content, 'id' | 'name' | 'type'> & {
    project: {
      id: string;
      removeBranding: boolean;
    };
  };
  expandPending?: boolean;
  currentStep?: Pick<Step, 'id' | 'cvid'>;
  version: {
    id: string;
    steps?: SessionStep[];
    theme?: SessionTheme;
    checklist?: ChecklistData;
  };
};

export type TrackCondition = {
  contentId: string;
  contentType: ContentDataType;
  versionId: string;
  condition: RulesCondition;
};

export type ConditionWaitTimer = {
  versionId: string;
  waitTime: number;
  activated?: boolean;
};

export type StartContentOptions = {
  startReason: contentStartReason;
  contentId?: string;
  stepCvid?: string;
};

export type UnTrackedCondition = {
  conditionId: string;
};

export type ClientCondition = {
  conditionId: string;
  contentType: ContentDataType;
  isActive?: boolean;
};
