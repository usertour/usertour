import { useEffect } from 'react';
import { useFrame } from '@usertour-packages/frame';

export function useFrameGlobalStyle(globalStyle?: string) {
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle && document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);
}
