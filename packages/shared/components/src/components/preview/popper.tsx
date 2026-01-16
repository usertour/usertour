import { EyeNoneIcon } from '@usertour-packages/icons';
import {
  Popper,
  PopperStaticContent,
  PopperClose,
  useSettingsStyles,
} from '@usertour-packages/sdk';
import { ContentEditorSerialize } from '@usertour-packages/shared-editor';
import { ThemeTypesSetting, defaultSettings } from '@usertour/types';
import { memo, useCallback, useRef } from 'react';

type CreatePopperContentProps = {
  text: string;
  data: any;
  type: string;
  key: number;
  settings: ThemeTypesSetting;
  onClick: (type: string, data: string) => void;
  width: string;
  height: string;
  scale: number;
};

export const PopperPreview = memo((props: CreatePopperContentProps) => {
  const { width, height, text, data, type, onClick, scale = 1 } = props;
  const ref = useRef(null);

  // Use unified settings hook for CSS vars generation
  const { globalStyle, themeSetting } = useSettingsStyles(defaultSettings);

  const handleOnClick = useCallback(() => {
    onClick(type, data);
  }, [onClick, type, data]);

  return (
    <div
      className="rounded-lg bg-background-700 w-52 h-52 flex flex-col cursor-pointer"
      onClick={handleOnClick}
    >
      <div className="flex-none justify-center flex flex-col items-center h-44">
        {type !== 'hidden' && (
          <Popper triggerRef={ref} open={true} zIndex={1111} globalStyle={globalStyle}>
            <PopperStaticContent
              arrowSize={{
                width: 20,
                height: 10,
              }}
              customStyle={{ zoom: scale }}
              side="bottom"
              showArrow={type === 'tooltip'}
              width={width}
              height={height}
              arrowColor={themeSetting?.mainColor?.background}
            >
              <PopperClose />
              <ContentEditorSerialize contents={data} />
            </PopperStaticContent>
          </Popper>
        )}
        {type === 'hidden' && <EyeNoneIcon className="w-6 h-6" />}
      </div>
      <div className="bg-background-400 flex-none leading-8 text-foreground text-center rounded-b-lg">
        {text}
      </div>
    </div>
  );
});

PopperPreview.displayName = 'PopperPreview';
