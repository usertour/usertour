import { useLazyQuery } from '@apollo/client';
import { EXTENSION_CONTENT_MODAL } from '@usertour-packages/constants';
import { queryOembedInfo } from '@usertour-packages/gql';
import {
  Popper,
  PopperBubblePortal,
  PopperClose,
  PopperContent,
  PopperMadeWith,
  PopperProgress,
  useSettingsStyles,
  useStepWidth,
} from '@usertour-packages/widget';
import {
  ContentEditor,
  ContentEditorElementType,
  ContentEditorRoot,
} from '@usertour-packages/shared-editor';
import {
  Attribute,
  AvatarType,
  Content,
  ContentOmbedInfo,
  ContentVersion,
  ProgressBarPosition,
  ProgressBarType,
  Step,
  Theme,
  StepContentType,
} from '@usertour/types';
import { forwardRef, useEffect, useState } from 'react';

import { useBuilderContext } from '../contexts/builder-context';
import { useAws } from '../hooks/use-aws';
import { loadGoogleFontCss } from '../utils/loader';

export interface ContentBubbleProps {
  currentStep: Step;
  theme: Theme | undefined;
  attributeList: Attribute[] | undefined;
  currentVersion: ContentVersion | undefined;
  zIndex: number;
  currentIndex: number;
  onChange: (value: ContentEditorRoot[]) => void;
  contents: Content[];
  currentContent: Content | undefined;
  createStep: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
  projectId: string;
}

export const ContentBubble = forwardRef<HTMLDivElement, ContentBubbleProps>(
  (props: ContentBubbleProps, ref) => {
    const {
      currentStep,
      theme,
      attributeList,
      currentVersion,
      zIndex,
      onChange,
      contents,
      currentIndex,
      createStep,
      projectId,
    } = props;
    const [data, setData] = useState<any>(currentStep.data);
    const { upload } = useAws();
    const [queryOembed] = useLazyQuery(queryOembedInfo);
    const { globalStyle, themeSetting, avatarUrl, avatarComponent } = useSettingsStyles(
      theme?.settings,
      {
        type: StepContentType.BUBBLE,
      },
    );

    const { shouldShowMadeWith = true } = useBuilderContext();

    const handleEditorValueChange = (value: any) => {
      setData(value);
      onChange(value);
    };

    const handleCustomUploadRequest = (file: File): Promise<string> => {
      return upload(file);
    };

    const getOembedInfo = async (url: string): Promise<ContentOmbedInfo> => {
      const resp = { html: '', width: 0, height: 0 };
      const ret = await queryOembed({ variables: { url } });
      if (ret?.data?.queryOembedInfo) {
        return ret?.data?.queryOembedInfo;
      }
      return resp;
    };

    useEffect(() => {
      if (themeSetting?.font?.fontFamily) {
        loadGoogleFontCss(themeSetting.font.fontFamily, document);
      }
    }, [themeSetting]);

    const totalSteps = currentVersion?.steps?.length ?? 0;

    // Get width with theme fallback if undefined
    const { width } = useStepWidth({ step: currentStep, themeSetting });

    const progressType = themeSetting?.progress.type;
    const progressPosition = themeSetting?.progress.position;
    const progressEnabled = themeSetting?.progress.enabled;
    const enabledElementTypes = Object.values(ContentEditorElementType);

    // Optimized progress display logic
    const isFullWidthProgress = progressType === ProgressBarType.FULL_WIDTH;
    const showTopProgress =
      progressEnabled && (isFullWidthProgress || progressPosition === ProgressBarPosition.TOP);
    const showBottomProgress =
      progressEnabled && !isFullWidthProgress && progressPosition === ProgressBarPosition.BOTTOM;

    // Determine whether to show avatar based on avatar type
    const showAvatar = themeSetting?.avatar?.type !== AvatarType.NONE;

    return (
      <Popper triggerRef={undefined} open={true} zIndex={zIndex} globalStyle={globalStyle}>
        <PopperBubblePortal
          position={themeSetting?.bubble?.placement?.position ?? 'rightBottom'}
          positionOffsetX={themeSetting?.bubble?.placement?.positionOffsetX}
          positionOffsetY={themeSetting?.bubble?.placement?.positionOffsetY}
          width={`${width}px`}
          avatarSize={themeSetting?.avatar?.size}
          avatarSrc={avatarUrl}
          avatarComponent={avatarComponent}
          showAvatar={showAvatar}
          ref={ref}
        >
          <PopperContent>
            {currentStep.setting.skippable && <PopperClose />}
            {showTopProgress && (
              <PopperProgress
                width={60}
                type={progressType}
                currentStepIndex={currentIndex}
                position={progressPosition}
                totalSteps={totalSteps}
              />
            )}
            <ContentEditor
              zIndex={zIndex + EXTENSION_CONTENT_MODAL}
              enabledElementTypes={enabledElementTypes}
              customUploadRequest={handleCustomUploadRequest}
              initialValue={data}
              projectId={projectId}
              attributes={attributeList}
              contentList={contents}
              currentVersion={currentVersion}
              currentStep={currentStep}
              onValueChange={handleEditorValueChange}
              getOembedInfo={getOembedInfo}
              createStep={createStep}
            />
            {showBottomProgress && (
              <PopperProgress
                width={60}
                type={progressType}
                currentStepIndex={currentIndex}
                position={progressPosition}
                totalSteps={totalSteps}
              />
            )}
            {shouldShowMadeWith && <PopperMadeWith />}
          </PopperContent>
        </PopperBubblePortal>
      </Popper>
    );
  },
);
ContentBubble.displayName = 'ContentBubble';
