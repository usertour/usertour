import {
  AttributeBizTypes,
  ChecklistData,
  Content,
  ContentDataType,
  ContentVersion,
  RulesCondition,
  Step,
  Theme,
} from '@usertour/types';

export type SessionAttribute = {
  id: string;
  codeName: string;
  value: any;
  bizType: AttributeBizTypes;
};

export type SessionTheme = Pick<Theme, 'settings' | 'variations'> & {
  attributes?: SessionAttribute[];
};

export type SessionStep = Step & {
  theme?: SessionTheme;
};

export type SDKContentSession = {
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
  version: Pick<ContentVersion, 'id' | 'config' | 'data'> & {
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

export type StartContentOptions = {
  contentId?: string;
  stepIndex?: number;
};

export type UnTrackedCondition = {
  conditionId: string;
};
