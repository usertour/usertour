import { useLazyQuery } from '@apollo/client';
import { EXTENSION_CONTENT_POPPER } from '@usertour-ui/constants';
import { queryOembedInfo } from '@usertour-ui/gql';
import {
  Popper,
  PopperClose,
  PopperContent,
  PopperContentPotal,
  PopperMadeWith,
  PopperOverlay,
  PopperProgress,
} from '@usertour-ui/sdk';
import {
  ContentEditor,
  ContentEditorElementType,
  ContentEditorRoot,
} from '@usertour-ui/shared-editor';
import { convertSettings, convertToCssVars, loadGoogleFontCss } from '@usertour-ui/shared-utils';
import {
  Align,
  Attribute,
  Content,
  ContentOmbedInfo,
  ContentVersion,
  Side,
  Step,
  Theme,
  ThemeTypesSetting,
} from '@usertour-ui/types';
import { forwardRef, useEffect, useState } from 'react';
import { useAws } from '../hooks/use-aws';

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
    const [globalStyle, setGlobalStyle] = useState<string>('');
    const [themeSetting, setThemeSetting] = useState<ThemeTypesSetting>();
    const [data, setData] = useState<any>(currentStep.data);
    const [queryOembed] = useLazyQuery(queryOembedInfo);

    const { upload } = useAws();

    const handleEditorValueChange = (value: any) => {
      setData(value);
      onChange(value);
    };
    const handleCustomUploadRequest = (file: File): Promise<string> => {
      return upload(file);
    };

    useEffect(() => {
      if (theme) {
        setThemeSetting(theme.settings);
      }
    }, [theme]);

    useEffect(() => {
      if (themeSetting) {
        setGlobalStyle(convertToCssVars(convertSettings(themeSetting)));
      }
    }, [themeSetting]);

    useEffect(() => {
      if (themeSetting?.font?.fontFamily) {
        loadGoogleFontCss(themeSetting.font.fontFamily, document);
      }
    }, [themeSetting]);

    const getOembedInfo = async (url: string): Promise<ContentOmbedInfo> => {
      const resp = { html: '', width: 0, height: 0 };
      const ret = await queryOembed({ variables: { url } });
      if (ret?.data?.queryOembedInfo) {
        return ret?.data?.queryOembedInfo;
      }
      return resp;
    };

    const totalSteps = currentVersion?.steps?.length ?? 0;

    const progress = Math.min(
      totalSteps > 0 ? Math.round(((currentIndex + 1) / totalSteps) * 100) : 0,
      100,
    );

    const enabledElementTypes = Object.values(ContentEditorElementType);

    if (!triggerRef?.current) {
      return <></>;
    }

    return (
      <>
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
            width={`${currentStep.setting.width}px`}
            arrowSize={{
              width: themeSetting?.tooltip.notchSize ?? 20,
              height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
            }}
            arrowColor={themeSetting?.mainColor.background}
            ref={ref}
          >
            <PopperContent>
              {currentStep.setting.skippable && <PopperClose />}
              <ContentEditor
                zIndex={zIndex + EXTENSION_CONTENT_POPPER}
                customUploadRequest={handleCustomUploadRequest}
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
              <PopperMadeWith />
              <PopperProgress width={progress} />
            </PopperContent>
          </PopperContentPotal>
        </Popper>
      </>
    );
  },
);
ContentPopper.displayName = 'ContentPopper';
