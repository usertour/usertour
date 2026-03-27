import { forwardRef } from 'react';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { useResourceCenterContext } from './context';

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
    <div ref={composedRefs} className="usertour-widget-chrome usertour-widget-root">
      {children}
    </div>
  );
});

ResourceCenterStyleProvider.displayName = 'ResourceCenterStyleProvider';
