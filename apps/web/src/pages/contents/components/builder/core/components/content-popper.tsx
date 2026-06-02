import { EXTENSION_CONTENT_POPPER } from '@usertour/constants';
import {
  Popper,
  PopperClose,
  PopperContent,
  PopperContentPotal,
  PopperMadeWith,
  PopperOverlay,
  PopperProgress,
  useSettingsStyles,
  useStepWidth,
} from '@usertour/widget';
import { ContentEditor, ContentEditorElementType, ContentEditorRoot } from '@usertour/editor';
import { GoogleFontCss } from '@usertour/business-components';
import {
  Align,
  Attribute,
  Content,
  ContentVersion,
  ProgressBarPosition,
  ProgressBarType,
  Side,
  Step,
  Theme,
} from '@usertour/types';
import { forwardRef, useState } from 'react';
import { useAws } from '@usertour/hooks';
import { useOembedInfo } from '@/pages/contents/components/builder/core/hooks/use-oembed-info';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';

export interface ContentPopperProps {
  currentStep: Step;
  theme: Theme | undefined;
  attributeList: Attribute[] | undefined;
  currentVersion: ContentVersion | undefined;
  zIndex: number;
  onChange: (value: ContentEditorRoot[]) => void;
  contents: Content[];
  triggerRef?: React.RefObject<any> | undefined;
  currentIndex: number;
  currentContent: Content | undefined;
  createStep: (currentVersion: ContentVersion, sequence: number) => Promise<Step | undefined>;
  projectId: string;
}

export const ContentPopper = forwardRef<HTMLDivElement, ContentPopperProps>(
  (props: ContentPopperProps, ref) => {
    const {
      currentStep,
      theme,
      attributeList,
      currentVersion,
      zIndex,
      onChange,
      contents,
      triggerRef,
      currentIndex,
      createStep,
      projectId,
    } = props;
    const [data, setData] = useState<any>(currentStep.data);
    const getOembedInfo = useOembedInfo();
    const { globalStyle, themeSetting } = useSettingsStyles(theme?.settings);
    const { shouldShowMadeWith = true } = useBuilderConfig();

    const { upload } = useAws();

    const handleEditorValueChange = (value: any) => {
      setData(value);
      onChange(value);
    };

    const totalSteps = currentVersion?.steps?.length ?? 0;

    // Get width with theme fallback if undefined
    const { width } = useStepWidth({ step: currentStep, themeSetting });

    const enabledElementTypes = Object.values(ContentEditorElementType);

    const progressType = themeSetting?.progress.type;
    const progressPosition = themeSetting?.progress.position;
    const progressEnabled = themeSetting?.progress.enabled;

    // Optimized progress display logic
    const isFullWidthProgress = progressType === ProgressBarType.FULL_WIDTH;
    const showTopProgress =
      progressEnabled && (isFullWidthProgress || progressPosition === ProgressBarPosition.TOP);
    const showBottomProgress =
      progressEnabled && !isFullWidthProgress && progressPosition === ProgressBarPosition.BOTTOM;

    if (!triggerRef?.current) {
      return <></>;
    }

    return (
      <>
        <GoogleFontCss settings={themeSetting} />
        <Popper triggerRef={triggerRef} open={true} zIndex={zIndex} globalStyle={globalStyle}>
          {currentStep.setting?.enabledBackdrop && (
            <PopperOverlay blockTarget={currentStep.setting.enabledBlockTarget} />
          )}
          <PopperContentPotal
            sideOffset={currentStep.setting.sideOffset}
            alignOffset={currentStep.setting.alignOffset}
            side={
              currentStep.setting?.alignType === 'auto'
                ? 'bottom'
                : ((currentStep.setting?.side as Side) ?? 'bottom')
            }
            align={
              currentStep.setting?.alignType === 'auto'
                ? 'center'
                : ((currentStep.setting?.align as Align) ?? 'center')
            }
            avoidCollisions={currentStep.setting?.alignType === 'auto'}
            width={`${width}px`}
            arrowSize={{
              width: themeSetting?.tooltip.notchSize ?? 20,
              height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
            }}
            arrowColor={themeSetting?.mainColor.background}
            ref={ref}
          >
            <PopperContent>
              {currentStep.setting.skippable && <PopperClose />}

              {showTopProgress && (
                <PopperProgress
                  type={progressType}
                  position={progressPosition}
                  currentStepIndex={currentIndex}
                  totalSteps={totalSteps}
                />
              )}
              <ContentEditor
                zIndex={zIndex + EXTENSION_CONTENT_POPPER}
                customUploadRequest={upload}
                initialValue={data}
                attributes={attributeList}
                enabledElementTypes={enabledElementTypes}
                currentStep={currentStep}
                contentList={contents}
                currentVersion={currentVersion}
                onValueChange={handleEditorValueChange}
                getOembedInfo={getOembedInfo}
                createStep={createStep}
                projectId={projectId}
              />
              {showBottomProgress && (
                <PopperProgress
                  type={progressType}
                  position={progressPosition}
                  currentStepIndex={currentIndex}
                  totalSteps={totalSteps}
                />
              )}
              {shouldShowMadeWith && <PopperMadeWith />}
            </PopperContent>
          </PopperContentPotal>
        </Popper>
      </>
    );
  },
);
ContentPopper.displayName = 'ContentPopper';
