import { EyeNoneIcon } from '@usertour-packages/icons';
import {
  ContentEditorSerialize,
  Popper,
  PopperStaticContent,
  PopperStaticBubble,
  PopperClose,
  useSettingsStyles,
} from '@usertour-packages/widget';
import { ScaledPreviewContainer } from '@usertour-packages/shared-components';
import { AvatarType, defaultSettings, StepContentType } from '@usertour/types';
import { memo, useCallback, useMemo, useRef } from 'react';

type PopperPreviewProps = {
  text: string;
  data: any;
  type: string;
  onClick: (type: string, data: any) => void;
  width: string;
  height: string;
  /** Max width for auto-scaling (default: 180) */
  maxWidth?: number;
  /** Max height for auto-scaling (default: 160) */
  maxHeight?: number;
};

export const PopperPreview = memo((props: PopperPreviewProps) => {
  const { width, height, text, data, type, onClick, maxWidth = 180, maxHeight = 160 } = props;
  const ref = useRef(null);

  // Use unified settings hook for CSS vars generation
  const { globalStyle, themeSetting, avatarUrl } = useSettingsStyles(defaultSettings);

  const handleOnClick = useCallback(() => {
    onClick(type, data);
  }, [onClick, type, data]);

  // Memoized bubble type preview
  const bubblePreview = useMemo(() => {
    const bubbleSettings = themeSetting?.bubble;
    const avatarSettings = themeSetting?.avatar;
    const showAvatar = avatarSettings?.type !== AvatarType.NONE;

    return (
      <Popper triggerRef={ref} open={true} zIndex={1111} globalStyle={globalStyle}>
        <PopperStaticBubble
          position={bubbleSettings?.placement?.position ?? 'leftBottom'}
          width={width}
          avatarSize={avatarSettings?.size ?? 60}
          avatarSrc={avatarUrl}
          notchSize={themeSetting?.tooltip?.notchSize ?? 20}
          notchColor={themeSetting?.mainColor?.background}
          showAvatar={showAvatar}
        >
          <PopperClose />
          <ContentEditorSerialize contents={data} />
        </PopperStaticBubble>
      </Popper>
    );
  }, [themeSetting, globalStyle, avatarUrl, width, data]);

  // Memoized tooltip/modal type preview
  const popperPreview = useMemo(
    () => (
      <Popper triggerRef={ref} open={true} zIndex={1111} globalStyle={globalStyle}>
        <PopperStaticContent
          arrowSize={{
            width: 20,
            height: 10,
          }}
          side="bottom"
          showArrow={type === StepContentType.TOOLTIP}
          width={width}
          height={height}
          arrowColor={themeSetting?.mainColor?.background}
        >
          <PopperClose />
          <ContentEditorSerialize contents={data} />
        </PopperStaticContent>
      </Popper>
    ),
    [globalStyle, type, width, height, themeSetting?.mainColor?.background, data],
  );

  return (
    <div
      className="rounded-lg bg-background-700 w-52 h-52 flex flex-col cursor-pointer"
      onClick={handleOnClick}
    >
      <div className="flex-none justify-center flex flex-col items-center h-44">
        {type !== StepContentType.HIDDEN && (
          <ScaledPreviewContainer
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            className="origin-[center_center]"
          >
            {type === StepContentType.BUBBLE ? bubblePreview : popperPreview}
          </ScaledPreviewContainer>
        )}
        {type === StepContentType.HIDDEN && <EyeNoneIcon className="w-6 h-6" />}
      </div>
      <div className="bg-background-400 flex-none leading-8 text-foreground text-center rounded-b-lg">
        {text}
      </div>
    </div>
  );
});

PopperPreview.displayName = 'PopperPreview';
