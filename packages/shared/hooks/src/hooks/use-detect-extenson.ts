import { MESSAGE_CRX_PING, MESSAGE_CRX_PONG } from '@usertour-packages/constants';
import { useCallback, useState } from 'react';
import { useEvent, useInterval } from 'react-use';

export const useDetectExtension = () => {
  const [isTimeout, setIsTimeout] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [delay, _] = useState<number>(1000);
  const [count, setCount] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const maxCount = 60 * 60 * 8;

  const postMessage = () => {
    window.postMessage(
      {
        kind: MESSAGE_CRX_PING,
      },
      window.location.href,
    );
  };

  useInterval(
    () => {
      if (isInstalled) {
        setIsRunning(false);
        return;
      }
      if (count >= 60) {
        setIsTimeout(true);
        return;
      }
      if (count >= maxCount) {
        setIsRunning(false);
        return;
      }
      postMessage();
      setCount((c: number) => c + 1);
    },
    isRunning ? delay : null,
  );

  const start = () => {
    setCount(0);
    setIsTimeout(false);
    setIsInstalled(false);
    setIsTimeout(false);
    setIsRunning(true);
  };

  const stop = () => {
    setIsRunning(false);
  };

  const pageMessageListener = useCallback(
    (e: any) => {
      const message = e.data;
      if (isRunning && message && message.kind === MESSAGE_CRX_PONG) {
        setIsInstalled(true);
      }
    },
    [isRunning],
  );

  useEvent('message', pageMessageListener, window, { capture: true });

  return { isInstalled, isTimeout, start, stop };
};
