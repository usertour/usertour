import { EXTENSION_CONTENT_MODAL } from '@usertour/constants';
import {
  Popper,
  PopperClose,
  PopperContent,
  PopperMadeWith,
  PopperModalContentPotal,
  PopperProgress,
  useSettingsStyles,
  useStepWidth,
} from '@usertour/widget';
import { ContentEditor, ContentEditorElementType, ContentEditorRoot } from '@usertour/editor';
import { loadGoogleFontCss } from '@/pages/contents/components/builder/utils/loader';
import {
  Attribute,
  Content,
  ContentVersion,
  ProgressBarPosition,
  ProgressBarType,
  Step,
  Theme,
} from '@usertour/types';
import { forwardRef, useEffect, useState } from 'react';
import { useAws } from '@usertour/hooks';
import { useOembedInfo } from '@/pages/contents/components/builder/hooks/use-oembed-info';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';

export interface ContentModalProps {
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

export const ContentModal = forwardRef<HTMLDivElement, ContentModalProps>(
  (props: ContentModalProps, ref) => {
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
    const getOembedInfo = useOembedInfo();
    const { globalStyle, themeSetting } = useSettingsStyles(theme?.settings, { type: 'modal' });
    const { shouldShowMadeWith = true } = useBuilderConfig();

    const handleEditorValueChange = (value: any) => {
      setData(value);
      onChange(value);
    };

    const handleCustomUploadRequest = (file: File): Promise<string> => {
      return upload(file);
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

    return (
      <>
        <Popper triggerRef={undefined} open={true} zIndex={zIndex} globalStyle={globalStyle}>
          <PopperModalContentPotal
            position={currentStep.setting.position}
            positionOffsetX={currentStep.setting.positionOffsetX}
            positionOffsetY={currentStep.setting.positionOffsetY}
            enabledBackdrop={currentStep.setting.enabledBackdrop}
            width={`${width}px`}
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
          </PopperModalContentPotal>
        </Popper>
      </>
    );
  },
);
ContentModal.displayName = 'ContentModal';
