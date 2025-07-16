import { Button } from '@usertour-ui/button';
import * as SharedPopper from '@usertour-ui/sdk';
import { ContentEditorSerialize, createValue5 } from '@usertour-ui/shared-editor';
import { ProgressBarPosition, ProgressBarType, ThemeTypesSetting } from '@usertour-ui/types';
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

  return (
    <div className="h-full w-full scale-100">
      <Button className="ml-8 mt-16 w-40 rounded-xl	" ref={ref}>
        Tooltip target
      </Button>
      {customStyle && (
        <SharedPopper.Popper triggerRef={ref} open={true} zIndex={1111} globalStyle={customStyle}>
          <SharedPopper.PopperOverlay blockTarget={true} viewportRect={viewRect} />
          <SharedPopper.PopperContentPotal
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
            <SharedPopper.PopperContent>
              <SharedPopper.PopperClose />
              {showTopProgress && (
                <SharedPopper.PopperProgress
                  type={progressType}
                  position={progressPosition}
                  currentStepIndex={2}
                  totalSteps={4}
                />
              )}
              <ContentEditorSerialize contents={createValue5 as any} />
              <SharedPopper.PopperMadeWith />
              {showBottomProgress && (
                <SharedPopper.PopperProgress
                  type={progressType}
                  position={progressPosition}
                  currentStepIndex={2}
                  totalSteps={4}
                />
              )}
            </SharedPopper.PopperContent>
          </SharedPopper.PopperContentPotal>
        </SharedPopper.Popper>
      )}
    </div>
  );
};

ThemePreviewPopper.displayName = 'ThemePreviewPopper';
