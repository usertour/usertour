import { Button } from '@usertour-packages/button';
import {
  Popper,
  PopperContent,
  PopperContentPotal,
  PopperMadeWith,
  PopperProgress,
  PopperClose,
  PopperOverlay,
} from '@usertour-packages/sdk';
import { ContentEditorSerialize, createValue5 } from '@usertour-packages/shared-editor';
import { ProgressBarPosition, ProgressBarType, ThemeTypesSetting } from '@usertour/types';
import { useRef } from 'react';
import { Rect } from '../theme-editor';

interface ThemePreviewPopperProps {
  settings?: ThemeTypesSetting;
  customStyle?: string;
  viewRect?: Rect;
}

export const ThemePreviewPopper = ({
  settings,
  customStyle,
  viewRect,
}: ThemePreviewPopperProps) => {
  const ref = useRef(null);
  const progressType = settings?.progress.type;
  const progressPosition = settings?.progress.position;
  const progressEnabled = settings?.progress.enabled;

  // Optimized progress display logic
  const isFullWidthProgress = progressType === ProgressBarType.FULL_WIDTH;
  const showTopProgress =
    progressEnabled && (isFullWidthProgress || progressPosition === ProgressBarPosition.TOP);
  const showBottomProgress =
    progressEnabled && !isFullWidthProgress && progressPosition === ProgressBarPosition.BOTTOM;

  if (!viewRect || !customStyle) {
    return null;
  }

  return (
    <div className="h-full w-full scale-100">
      <Button className="ml-8 mt-16 w-40 rounded-xl	" ref={ref}>
        Tooltip target
      </Button>
      <Popper triggerRef={ref} open={true} zIndex={1111} globalStyle={customStyle}>
        <PopperOverlay blockTarget={true} viewportRect={viewRect} />
        <PopperContentPotal
          sideOffset={10}
          alignOffset={10}
          avoidCollisions={true}
          side={'right'}
          align={'center'}
          width={`${settings?.tooltip.width}px`}
          arrowSize={{
            width: settings?.tooltip.notchSize ?? 20,
            height: (settings?.tooltip.notchSize ?? 10) / 2,
          }}
          arrowColor={settings?.mainColor.background}
        >
          <PopperContent>
            <PopperClose />
            {showTopProgress && (
              <PopperProgress
                type={progressType}
                position={progressPosition}
                currentStepIndex={2}
                totalSteps={4}
              />
            )}
            <ContentEditorSerialize contents={createValue5 as any} />
            <PopperMadeWith />
            {showBottomProgress && (
              <PopperProgress
                type={progressType}
                position={progressPosition}
                currentStepIndex={2}
                totalSteps={4}
              />
            )}
          </PopperContent>
        </PopperContentPotal>
      </Popper>
    </div>
  );
};

ThemePreviewPopper.displayName = 'ThemePreviewPopper';
