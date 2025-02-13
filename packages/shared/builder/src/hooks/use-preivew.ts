import {
  MESSAGE_CONTENT_PREVIEW_SUCCESS,
  MESSAGE_CRX_OPEN_TARGET,
  MESSAGE_CRX_OPEN_TARGET_REPLY,
  MESSAGE_CRX_SEND_PROXY,
  MESSAGE_START_FLOW_WITH_TOKEN,
} from '@usertour-ui/constants';
import { uuidV4 } from '@usertour-ui/ui-utils';
import { useCallback, useState } from 'react';
import { useEvent } from 'react-use';

import { postProxyMessageToWindow } from '../utils/post-message';

export const usePreview = (props: { usertourjsUrl: string }) => {
  const { usertourjsUrl } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [params, setParams] = useState({});
  const [idempotentKey, setIdempotentKey] = useState('');
  const [retryTimer, setRetryTimer] = useState<any | null>(null);

  const openTarget = (url: string) => {
    postProxyMessageToWindow({
      kind: MESSAGE_CRX_OPEN_TARGET,
      url: url,
    });
  };
  const sendMessage = useCallback(async () => {
    postProxyMessageToWindow({
      kind: MESSAGE_CRX_SEND_PROXY,
      direction: 'builderToTarget',
      message: {
        kind: MESSAGE_START_FLOW_WITH_TOKEN,
        usertourjsUrl,
        ...params,

        idempotentKey,
      },
    });
  }, [params, idempotentKey]);

  const clear = useCallback(() => {
    setIsLoading(false);
    if (retryTimer) {
      clearInterval(retryTimer);
    }
  }, [retryTimer, isLoading]);

  const pageMessageListener = useCallback(
    (e: any) => {
      const message = e.data;
      if (message.kind === MESSAGE_CRX_OPEN_TARGET_REPLY) {
        let i = 0;
        const timer = setInterval(() => {
          if (i === 10) {
            clear();
            return;
          }
          sendMessage();
          i++;
        }, 2000);
        setRetryTimer(timer);
      } else if (
        message.kind === MESSAGE_CONTENT_PREVIEW_SUCCESS &&
        message?.data?.idempotentKey === idempotentKey
      ) {
        clear();
      }
    },
    [retryTimer, isLoading, idempotentKey],
  );
  useEvent('message', pageMessageListener, window, { capture: false });

  const preview = (url: string, params: any) => {
    setIdempotentKey(uuidV4());
    setParams(params);
    setIsLoading(true);
    openTarget(url);
    if (retryTimer) {
      clearInterval(retryTimer);
    }
  };

  return { preview, isLoading };
};
