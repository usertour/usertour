import { EyeNoneIcon } from '@usertour-ui/icons';
import * as SharedPopper from '@usertour-ui/sdk';
import { ContentEditorSerialize } from '@usertour-ui/shared-editor';
import { convertSettings, convertToCssVars } from '@usertour-ui/shared-utils';
import { ThemeTypesSetting, defaultSettings } from '@usertour-ui/types';
import { useRef } from 'react';

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

export const PopperPreview = (props: CreatePopperContentProps) => {
  const { width, height, text, data, type, onClick, scale = 1 } = props;
  const handleOnClick = () => {
    onClick(type, data);
  };
  const ref = useRef(null);
  // const serialize = data ? serializeData(JSON.parse(data)) : [];
  return (
    <div
      className="rounded-lg bg-background-700 w-52 h-52 flex flex-col cursor-pointer"
      onClick={handleOnClick}
    >
      <div
        className="flex-none justify-center flex flex-col items-center h-44	"
        // style={{ transform: `scale(${scale})` }}
      >
        {type !== 'hidden' && (
          <SharedPopper.Popper
            triggerRef={ref}
            open={true}
            zIndex={1111}
            globalStyle={convertToCssVars(convertSettings(defaultSettings))}
          >
            <SharedPopper.PopperStaticContent
              arrowSize={{
                width: 20,
                height: 10,
              }}
              customStyle={{ zoom: scale }}
              side="bottom"
              showArrow={type === 'tooltip'}
              width={width}
              height={height}
              arrowColor={defaultSettings?.mainColor.background}
            >
              <SharedPopper.PopperClose />
              {/* {...serialize} */}
              <ContentEditorSerialize contents={data} />
            </SharedPopper.PopperStaticContent>
          </SharedPopper.Popper>
        )}
        {type === 'hidden' && <EyeNoneIcon className="w-6 h-6" />}
      </div>
      <div className="bg-background-400 flex-none leading-8 text-foreground text-center rounded-b-lg">
        {text}
      </div>
    </div>
  );
};

PopperPreview.displayName = 'PopperPreview';
