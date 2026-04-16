import { forwardRef } from 'react';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { useResourceCenterContext } from './context';
import { WidgetClass } from '../class-names';

export const ResourceCenterStyleProvider = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode }
>(({ children }, ref) => {
  const { globalStyle } = useResourceCenterContext();
  const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
    if (el?.style) {
      el.style.cssText = globalStyle;
    }
  });

  return (
    <div ref={composedRefs} className={`${WidgetClass.stage} ${WidgetClass.root}`}>
      {children}
    </div>
  );
});

ResourceCenterStyleProvider.displayName = 'ResourceCenterStyleProvider';
