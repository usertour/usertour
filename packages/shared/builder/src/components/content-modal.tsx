import { useLazyQuery } from '@apollo/client';
import { EXTENSION_CONTENT_MODAL } from '@usertour-packages/constants';
import { queryOembedInfo } from '@usertour-packages/gql';
import {
  Popper,
  PopperClose,
  PopperContent,
  PopperMadeWith,
  PopperModalContentPotal,
  PopperProgress,
  useThemeStyles,
} from '@usertour-packages/sdk';
import {
  ContentEditor,
  ContentEditorElementType,
  ContentEditorRoot,
} from '@usertour-packages/shared-editor';
import { loadGoogleFontCss } from '../utils/loader';
import {
  Attribute,
  Content,
  ContentOmbedInfo,
  ContentVersion,
  ProgressBarPosition,
  ProgressBarType,
  Step,
  Theme,
} from '@usertour/types';
import { forwardRef, useEffect, useState } from 'react';
import { useAws } from '../hooks/use-aws';

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
    const [queryOembed] = useLazyQuery(queryOembedInfo);
    const { globalStyle, themeSetting } = useThemeStyles(theme as Theme);

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
            width={`${currentStep.setting.width}px`}
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
              <PopperMadeWith />
              {showBottomProgress && (
                <PopperProgress
                  width={60}
                  type={progressType}
                  currentStepIndex={currentIndex}
                  position={progressPosition}
                  totalSteps={totalSteps}
                />
              )}
            </PopperContent>
          </PopperModalContentPotal>
        </Popper>
      </>
    );
  },
);
ContentModal.displayName = 'ContentModal';
