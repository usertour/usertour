import { defaultStep, getErrorMessage, isEqual } from '@usertour/helpers';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useEvent } from 'react-use';

import { useToast } from '@usertour-packages/use-toast';
import { debug } from '../utils/logger';
import { SelectorOutput } from '../utils/screenshot';
import { getEmptyDataForType } from '../utils/default-data';
import { duplicateStep, generateUniqueCopyName } from '@usertour/helpers';
import {
  useGetContentLazyQuery,
  useGetContentVersionLazyQuery,
  useAddContentStepsMutation,
  useAddContentStepMutation,
} from '@usertour-packages/shared-hooks';

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
  fetchContentAndVersion: (
    contentId: string,
    versionId: string,
  ) => Promise<false | { content: Content; version: ContentVersion }>;
  createStep: (currentVersion: ContentVersion, step: Step) => Promise<Step | undefined>;
  createNewStep: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
  shouldShowMadeWith?: boolean;
}

export const BuilderContext = createContext<BuilderContextProps | null>(null);

export interface BuilderProviderProps {
  children?: ReactNode;
  isWebBuilder?: boolean;
  webHost?: string;
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}

export const BuilderProvider = (props: BuilderProviderProps) => {
  const {
    children,
    webHost = '',
    usertourjsUrl = '',
    isWebBuilder = false,
    onSaved,
    shouldShowMadeWith = true,
  } = props;
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [environmentId, setEnvironmentId] = useState<string>('');
  const [envToken, setEnvToken] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectorOutput, setSelectorOutput] = useState<SelectorOutput | null>(null);
  const [isShowError, setIsShowError] = useState<boolean>(false);
  const [position, setPosition] = useState('left');
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentMode, setCurrentMode] = useState<CurrentMode>({
    mode: BuilderMode.NONE,
  });
  const [currentContent, setCurrentContent] = useState<Content | undefined>();
  const contentRef = useRef<HTMLDivElement | undefined>();
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | undefined>();
  const [backupVersion, setBackupVersion] = useState<ContentVersion | undefined>();
  const [currentTheme, setCurrentTheme] = useState<Theme | undefined>();
  const { toast } = useToast();

  // GraphQL hooks
  const { invoke: getContent } = useGetContentLazyQuery();
  const { invoke: getContentVersion } = useGetContentVersionLazyQuery();
  const { invoke: addContentSteps } = useAddContentStepsMutation();
  const { invoke: addContentStep } = useAddContentStepMutation();

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
    const content = await getContent(contentId);
    if (!content) {
      return false;
    }
    return content as Content;
  };

  const fetchVersion = async (versionId: string) => {
    const version = await getContentVersion(versionId);

    if (!version) {
      return false;
    }
    return version as ContentVersion;
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
    return { content, version };
  };

  const initContent = async (message: any) => {
    const {
      contentId,
      environmentId,
      envToken,
      url = '',
      versionId,
      projectId,
      initialStepIndex,
    } = message;
    if (!environmentId || (!isWebBuilder && !envToken)) {
      return false;
    }

    setEnvToken(envToken);
    setIsLoading(true);
    setCurrentLocation(url);
    setEnvironmentId(environmentId);
    setProjectId(projectId);
    const result = await fetchContentAndVersion(contentId, versionId);
    if (!result) {
      setIsLoading(false);
      return false;
    }
    setIsLoading(false);

    const { content, version } = result;
    const versionType = content.type.toString();
    const versionMode = versionType as BuilderMode;
    const hasMode = Object.values(BuilderMode).includes(versionMode);

    // Handle initial step for flow type - directly open step editor
    if (
      versionType === ContentDataType.FLOW &&
      initialStepIndex !== undefined &&
      version.steps?.[initialStepIndex]
    ) {
      const step = version.steps[initialStepIndex];
      const _step = JSON.parse(
        JSON.stringify({
          ...step,
          setting: { ...defaultStep.setting, ...step.setting },
        }),
      );
      setCurrentStep(_step);
      setCurrentIndex(initialStepIndex);
      setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
      return true;
    }

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
      const response = await addContentSteps(variables);
      if (response) {
        await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
    setIsLoading(false);
  }, [currentVersion, backupVersion, addContentSteps, fetchContentAndVersion, toast, setIsLoading]);

  const createStep = async (currentVersion: ContentVersion, step: Step) => {
    try {
      const createdStep = await addContentStep({ ...step, versionId: currentVersion.id });
      if (createdStep) {
        await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
        return createdStep as Step;
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  const createNewStep = async (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    stepToDuplicate?: Step,
  ) => {
    const finalStepType = stepType || stepToDuplicate?.type || 'tooltip';
    const existingStepNames = currentVersion?.steps?.map((step) => step.name) ?? [];

    let step: Step;
    if (stepToDuplicate) {
      // Duplicate step within the same flow - need new cvid
      const duplicated = duplicateStep(stepToDuplicate);
      step = {
        ...duplicated,
        cvid: undefined, // Remove cvid to generate new one within the same flow
        name: generateUniqueCopyName(stepToDuplicate.name, existingStepNames),
        sequence,
      } as Step;
    } else {
      step = {
        ...defaultStep,
        type: finalStepType,
        name: 'Untitled',
        data: getEmptyDataForType(),
        sequence,
        setting: {
          ...defaultStep.setting,
          // width is undefined by default (Auto - uses theme default)
        },
      };
    }

    return await createStep(currentVersion, step);
  };

  useEffect(() => {
    if (currentVersion && backupVersion && !isEqual(currentVersion, backupVersion)) {
      saveContent();
    }
  }, [currentVersion, backupVersion, saveContent]);

  // Warn user when closing page while saving
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    if (isLoading) {
      e.preventDefault();
    }
  });

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
    createNewStep,
    envToken,
    shouldShowMadeWith,
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
