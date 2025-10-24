'use client';

import { MESSAGE_MEASURE_INSTALL, MESSAGE_MEASURE_LISTENER } from '@usertour-packages/constants';
import { ElementSelectorPropsData, TargetData } from '@usertour/types';
import { cn, uuidV4 } from '@usertour/helpers';
import { forwardRef, useEffect, useState } from 'react';

import { PlusIcon } from '@usertour-packages/icons';
import { useEvent } from 'react-use';
import { postMessageToWindow } from '../utils/post-message';

const centerClasses =
  'w-auto h-6 left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%]';

// Extract common types
interface BaseListenerProps {
  onMounted: () => void;
}

// Extend base type
interface ExtensionElementListenerProps extends BaseListenerProps {
  selectorTarget?: ElementSelectorPropsData;
}

export const ExtensionElementListener = forwardRef<HTMLDivElement, ExtensionElementListenerProps>(
  (props, ref) => {
    const { onMounted, selectorTarget } = props;
    const [targetData, setTargetData] = useState<TargetData | null>(null);

    const onMessage = (e: Event) => {
      const event = e as MessageEvent;
      const { data } = event;
      if (data.kind !== MESSAGE_MEASURE_LISTENER) return;
      setTargetData(data.data);
    };

    useEvent('message', onMessage, window, {
      capture: false,
    });

    useEffect(() => {
      if (!selectorTarget) return;

      const idempotentKey = uuidV4();
      postMessageToWindow(MESSAGE_MEASURE_INSTALL, {
        idempotentKey,
        target: selectorTarget,
        enabled: true,
      });

      return () => {
        postMessageToWindow(MESSAGE_MEASURE_INSTALL, { enabled: false });
      };
    }, [selectorTarget]);

    // Execute only once when component is mounted
    useEffect(() => {
      onMounted();
    }, [onMounted]);

    const style = targetData && !targetData.failed ? { ...targetData, failed: undefined } : {};

    return (
      <div style={style} className={cn('fixed', targetData?.failed ? centerClasses : '')} ref={ref}>
        {targetData?.failed &&
          'The page element was not found on the current page, but you can continue editing the content'}
      </div>
    );
  },
);

ExtensionElementListener.displayName = 'ExtensionElementListener';

interface WebElementListenerProps {
  onMounted: () => void;
}
export const WebElementListener = forwardRef<SVGSVGElement, WebElementListenerProps>(
  ({ onMounted }, ref) => {
    useEffect(() => {
      onMounted();
    });
    return <PlusIcon width={24} height={24} ref={ref} className={cn('fixed', centerClasses)} />;
  },
);

WebElementListener.displayName = 'WebElementListener';
