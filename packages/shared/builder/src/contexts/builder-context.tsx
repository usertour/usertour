import { useLazyQuery, useMutation } from '@apollo/client';
import { addContentStep, addContentSteps, getContent, getContentVersion } from '@usertour-ui/gql';
import { getErrorMessage, isEqual } from '@usertour-ui/shared-utils';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour-ui/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useToast } from '@usertour-ui/use-toast';
import { debug } from '../utils/logger';
import { SelectorOutput } from '../utils/screenshot';

export enum BuilderMode {
  ELEMENT_SELECTOR = 'element-selector',
  FLOW_STEP_DETAIL = 'flow-step-detail',
  FLOW_STEP_TRIGGER = 'flow-step-trigger',
  FLOW = 'flow',
  LAUNCHER = 'launcher',
  CHECKLIST = 'checklist',
  BANNER = 'banner',
  LAUNCHER_TARGET = 'launcher-target',
  LAUNCHER_TOOLTIP = 'launcher-tooltip',
  CHECKLIST_ITEM = 'checklist-item',
  NONE = 'none',
}

export interface BuilderSelectorMode {
  mode: BuilderMode.ELEMENT_SELECTOR;
  backMode?: BuilderMode;
  data?: {
    isInput: boolean;
  };
  triggerConditionData?: {
    index: number;
    conditionIndex: number;
    type: string;
  };
}

export interface BuilderTriggerMode {
  mode: BuilderMode.FLOW_STEP_TRIGGER;
  data?: any;
  triggerConditionData?: {
    index: number;
    conditionIndex: number;
    type: string;
  };
}

export interface BuilderCommonMode {
  mode: Exclude<BuilderMode, BuilderMode.FLOW_STEP_TRIGGER | BuilderMode.ELEMENT_SELECTOR>;
  data?: any;
}

export type CurrentMode = BuilderCommonMode | BuilderSelectorMode | BuilderTriggerMode;

interface BuilderContextProps {
  currentMode: CurrentMode;
  setCurrentMode: React.Dispatch<React.SetStateAction<CurrentMode>>;
  environmentId: string;
  setEnvironmentId: React.Dispatch<React.SetStateAction<string>>;
  envToken: string;
  saveContent: () => Promise<void>;
  initContent: (message: any) => Promise<boolean>;
  currentStep: Step | null;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step | null>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  selectorOutput?: SelectorOutput | null;
  setSelectorOutput: React.Dispatch<React.SetStateAction<SelectorOutput | null>>;
  position: string;
  setPosition: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  zIndex: number;
  currentLocation: string;
  projectId: string;
  setProjectId: React.Dispatch<React.SetStateAction<string>>;
  currentContent: Content | undefined;
  setCurrentContent: React.Dispatch<React.SetStateAction<Content | undefined>>;
  currentVersion: ContentVersion | undefined;
  setCurrentVersion: React.Dispatch<React.SetStateAction<ContentVersion | undefined>>;
  backupVersion: ContentVersion | undefined;
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme | undefined>>;
  currentTheme: Theme | undefined;
  updateCurrentStep: (fn: (pre: Step) => Step) => void;
  webHost: string;
  usertourjsUrl: string;
  isWebBuilder: boolean;
  onSaved: () => Promise<void>;
  isShowError: boolean;
  setIsShowError: React.Dispatch<React.SetStateAction<boolean>>;
  contentRef: React.MutableRefObject<HTMLDivElement | undefined>;
  fetchContentAndVersion: (contentId: string, versionId: string) => Promise<boolean | Content>;
  createStep: (currentVersion: ContentVersion, step: Step) => Promise<Step | undefined>;
}

export const BuilderContext = createContext<BuilderContextProps | null>(null);

export interface BuilderProviderProps {
  children?: ReactNode;
  isWebBuilder?: boolean;
  webHost?: string;
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
}

export const BuilderProvider = (props: BuilderProviderProps) => {
  const { children, webHost = '', usertourjsUrl = '', isWebBuilder = false, onSaved } = props;
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [environmentId, setEnvironmentId] = useState<string>('');
  const [envToken, setEnvToken] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectorOutput, setSelectorOutput] = useState<SelectorOutput | null>(null);
  const [isShowError, setIsShowError] = useState<boolean>(false);
  const [position, setPosition] = useState('left');
  const [queryContent] = useLazyQuery(getContent);
  const [queryContentVersion] = useLazyQuery(getContentVersion);
  const [addContentStepsMutation] = useMutation(addContentSteps);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentMode, setCurrentMode] = useState<CurrentMode>({
    mode: BuilderMode.NONE,
  });
  const [currentContent, setCurrentContent] = useState<Content | undefined>();
  const contentRef = useRef<HTMLDivElement | undefined>();
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | undefined>();
  const [backupVersion, setBackupVersion] = useState<ContentVersion | undefined>();
  const [addContentStepMutation] = useMutation(addContentStep);
  const [currentTheme, setCurrentTheme] = useState<Theme | undefined>();
  const { toast } = useToast();

  const updateCurrentStep = (fn: Step | ((pre: Step) => Step)) => {
    setCurrentStep((pre) => {
      if (typeof fn === 'function') {
        return pre ? fn(pre) : pre;
      }
      return fn;
    });
  };

  const fetchContent = async (contentId: string) => {
    if (!contentId) {
      return false;
    }
    const ret = await queryContent({ variables: { contentId } });
    if (!ret?.data?.getContent) {
      return false;
    }
    return ret?.data?.getContent as Content;
  };

  const fetchVersion = async (versionId: string) => {
    const version = await queryContentVersion({
      variables: { versionId },
    });

    if (!version?.data?.getContentVersion) {
      return false;
    }
    return version?.data?.getContentVersion as ContentVersion;
  };

  const fetchContentAndVersion = async (contentId: string, versionId: string) => {
    if (!contentId || !versionId) {
      return false;
    }
    const content = await fetchContent(contentId);
    if (!content) {
      return false;
    }
    setCurrentContent(content);
    const version = await fetchVersion(versionId);
    if (!version) {
      return false;
    }
    setCurrentVersion(JSON.parse(JSON.stringify(version)));
    setBackupVersion(JSON.parse(JSON.stringify(version)));
    return content;
  };

  const initContent = async (message: any) => {
    const { contentId, environmentId, envToken, url = '', versionId, projectId } = message;
    if (!environmentId || (!isWebBuilder && !envToken)) {
      return false;
    }

    setEnvToken(envToken);
    setIsLoading(true);
    setCurrentLocation(url);
    setEnvironmentId(environmentId);
    setProjectId(projectId);
    const version = await fetchContentAndVersion(contentId, versionId);
    if (!version) {
      setIsLoading(false);
      return false;
    }
    setIsLoading(false);
    const versionType = version.type.toString();
    const versionMode = versionType as BuilderMode;
    const hasMode = Object.values(BuilderMode).includes(versionMode);

    if (versionType !== ContentDataType.FLOW && hasMode) {
      setCurrentMode({ mode: versionType as BuilderMode });
    } else {
      setCurrentMode({ mode: BuilderMode.FLOW });
    }
    return true;
  };

  const saveContent = useCallback(async () => {
    if (!currentVersion || !backupVersion || isEqual(currentVersion, backupVersion)) {
      return;
    }
    debug('saveContent:', currentVersion);
    if (!currentVersion || !currentVersion.id) {
      return;
    }
    setIsLoading(true);
    const steps = currentVersion.steps
      ? currentVersion.steps.map(({ updatedAt, createdAt, cvid, ...step }, index) => ({
          ...step,
          sequence: index,
        }))
      : [];
    const variables = {
      contentId: currentVersion.contentId,
      versionId: currentVersion.id,
      themeId: currentVersion.themeId,
      steps,
    };
    try {
      const response = await addContentStepsMutation({
        variables,
      });
      if (response.data.addContentSteps) {
        await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
    setIsLoading(false);
  }, [currentVersion]);

  const createStep = async (currentVersion: ContentVersion, step: Step) => {
    try {
      const ret = await addContentStepMutation({
        variables: { data: { ...step, versionId: currentVersion.id } },
      });
      if (ret.data.addContentStep) {
        await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
        return ret.data.addContentStep as Step;
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  useEffect(() => {
    if (currentVersion && backupVersion && !isEqual(currentVersion, backupVersion)) {
      saveContent();
    }
  }, [currentVersion, backupVersion]);

  const value = {
    currentMode,
    setCurrentMode,
    selectorOutput,
    setSelectorOutput,
    environmentId,
    setEnvironmentId,
    initContent,
    saveContent,
    currentStep,
    setCurrentStep,
    currentIndex,
    setCurrentIndex,
    position,
    setPosition,
    isLoading,
    setIsLoading,
    zIndex: 0,
    currentLocation,
    projectId,
    setProjectId,
    currentContent,
    setCurrentContent,
    currentVersion,
    setCurrentVersion,
    backupVersion,
    currentTheme,
    setCurrentTheme,
    updateCurrentStep,
    usertourjsUrl,
    webHost,
    isWebBuilder,
    onSaved,
    isShowError,
    setIsShowError,
    contentRef,
    fetchContentAndVersion,
    createStep,
    envToken,
  };
  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
};

export function useBuilderContext(): BuilderContextProps {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilderContext must be used within a BuilderProvider.');
  }
  return context;
}
