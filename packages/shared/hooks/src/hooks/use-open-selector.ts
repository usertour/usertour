import {
  MESSAGE_APPLICATION_CLOSE,
  MESSAGE_APPLICATION_INIT,
  MESSAGE_APPLICATION_INIT_SUCCESS,
  MESSAGE_CRX_OPEN_TARGET,
  MESSAGE_CRX_OPEN_TARGET_REPLY,
  MESSAGE_CRX_SEND_PROXY,
  MESSAGE_ELEMENT_SELECT_SUCCESS,
} from '@usertour-packages/constants';
import { uuidV4 } from '@usertour-packages/ui-utils';
import { useCallback, useState } from 'react';
import { useEvent } from 'react-use';

export const useOpenSelector = (token: string, onSuccess?: (data: any) => void) => {
  const [initParams, setInitParams] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [idempotentKey, setIdempotentKey] = useState('');
  const [retryTimer, setRetryTimer] = useState<any>(null);
  const postMessageForInit = useCallback(() => {
    window.postMessage(
      {
        kind: MESSAGE_CRX_SEND_PROXY,
        direction: 'builderToTarget',
        message: {
          kind: MESSAGE_APPLICATION_INIT,
          data: {
            idempotentKey,
            token,
            ...initParams,
          },
        },
      },
      window.location.href,
    );
  }, [initParams, idempotentKey]);

  const postMessageForOpenTarget = (url: string, idempotentKey: string) => {
    window.postMessage(
      {
        kind: MESSAGE_CRX_OPEN_TARGET,
        url: url,
        data: { idempotentKey },
      },
      window.location.href,
    );
  };

  const clear = useCallback(() => {
    setIsLoading(false);
    if (retryTimer) {
      clearInterval(retryTimer);
    }
  }, [retryTimer, isLoading]);

  const pageMessageListener = useCallback(
    (e: any) => {
      const message = e.data;
      if (!message || !message.data || message.data.idempotentKey !== idempotentKey) {
        return;
      }
      if (message.kind === MESSAGE_CRX_OPEN_TARGET_REPLY) {
        let i = 0;
        const timer = setInterval(() => {
          if (i >= 10) {
            clear();
            return;
          }
          postMessageForInit();
          i++;
        }, 2000);
        setRetryTimer(timer);
      } else if (
        message.kind === MESSAGE_APPLICATION_INIT_SUCCESS &&
        message?.data?.idempotentKey === idempotentKey
      ) {
        if (onSuccess) {
          onSuccess(true);
        }
        clear();
      } else if (message.kind === MESSAGE_ELEMENT_SELECT_SUCCESS) {
        // setOutput(message.output)
        if (message?.data?.output) {
          if (onSuccess) {
            onSuccess(message.data.output);
          }
          window.postMessage(
            {
              kind: MESSAGE_CRX_SEND_PROXY,
              direction: 'builderToTarget',
              message: {
                kind: MESSAGE_APPLICATION_CLOSE,
                data: {
                  idempotentKey,
                  token,
                },
              },
            },
            window.location.href,
          );
        }
      }
    },
    [retryTimer, isLoading, idempotentKey],
  );
  useEvent('message', pageMessageListener, window, { capture: true });

  const open = (url: string, params: any) => {
    const key = uuidV4();
    setRetryTimer(null);
    setInitParams(params);
    setIsLoading(true);
    setIdempotentKey(key);
    postMessageForOpenTarget(url, key);
  };
  return { open, isLoading };
};
