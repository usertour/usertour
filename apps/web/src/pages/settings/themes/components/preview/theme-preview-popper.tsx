import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { Button } from '@usertour-ui/button';
import * as SharedPopper from '@usertour-ui/sdk';
import { ContentEditorSerialize, createValue5 } from '@usertour-ui/shared-editor';
import { useRef } from 'react';

export const ThemePreviewPopper = () => {
  const { settings, customStyle, viewRect } = useThemeDetailContext();
  const ref = useRef(null);

  return (
    <div className="h-full w-full" style={{ transform: 'scale(1)' }}>
      <Button className="ml-8 mt-16 w-40 rounded-xl	" ref={ref}>
        Tooltip target
      </Button>
      {customStyle && (
        <SharedPopper.Popper triggerRef={ref} open={true} zIndex={1111} globalStyle={customStyle}>
          <SharedPopper.PopperOverlay blockTarget={true} viewportRect={viewRect} />
          <SharedPopper.PopperContentPotal
            sideOffset={1}
            alignOffset={1}
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
              <ContentEditorSerialize contents={createValue5 as any} />
              <SharedPopper.PopperMadeWith />
              <SharedPopper.PopperProgress width={60} />
            </SharedPopper.PopperContent>
          </SharedPopper.PopperContentPotal>
        </SharedPopper.Popper>
      )}
    </div>
  );
};

ThemePreviewPopper.displayName = 'ThemePreviewPopper';
