import {
  ChecklistData,
  Content,
  ContentDataType,
  ContentVersion,
  RulesCondition,
  Step,
  Theme,
} from '@usertour/types';

export type SDKContentSession = {
  id: string;
  type: ContentDataType;
  draftMode: boolean;
  data: any[];
  content: Pick<Content, 'id' | 'name' | 'type'> & {
    project: {
      id: string;
      removeBranding: boolean;
    };
  };
  expandPending?: boolean;
  currentStep?: Pick<Step, 'id' | 'cvid'>;
  version: Pick<ContentVersion, 'id' | 'steps' | 'config' | 'data'> & {
    theme?: Pick<Theme, 'settings' | 'variations'>;
    checklist?: ChecklistData;
  };
};

export type TrackCondition = {
  contentId: string;
  contentType: ContentDataType;
  versionId: string;
  condition: RulesCondition;
};

export type UnTrackedCondition = {
  conditionId: string;
};
