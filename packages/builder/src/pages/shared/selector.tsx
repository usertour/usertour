'use client';

import {
  MESSAGE_CRX_SEND_PROXY,
  MESSAGE_ELEMENT_SELECT_SUCCESS,
  MESSAGE_IFRAME_CONTAINER_STYLE,
  MESSAGE_SELECTOR_OUTPUT,
  MESSAGE_SELECTOR_SWITCH,
} from '@usertour-packages/constants';
import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { useEvent } from 'react-use';

import { BuilderMode, BuilderSelectorMode, useBuilderContext } from '../../contexts';
import { postMessageToWindow, postProxyMessageToWindow } from '../../utils/post-message';

import { ElementSelector } from '../../components/element-selector';
import { useAws } from '../../hooks/use-aws';
import { dataURLtoFile } from '../../utils/aws';
import { getInitParams } from '../../utils/storage';

const elementSelectorStyle: CSSProperties = {
  width: '60%',
  maxWidth: '1024px',
  height: '52px',
  left: '0px',
  right: '0px',
  bottom: '10px',
  margin: '0px auto',
  position: 'fixed',
  zIndex: 2147483001,
};

export const Selector = () => {
  const [enabledSelector, setEnabledSelector] = useState(true);
  const { setSelectorOutput, currentMode, setCurrentMode } = useBuilderContext();

  const { upload } = useAws();

  const onKeydown = useCallback(
    (event: any) => {
      if (event.key === 'Escape') {
        setEnabledSelector(false);
      }
    },
    [enabledSelector],
  );
  useEvent('keydown', onKeydown, window, { capture: true });

  const handleOnPositionChange = (isBottom: boolean) => {
    const message = { ...elementSelectorStyle };
    if (isBottom) {
      message.top = undefined;
      message.bottom = '10px';
    } else {
      message.bottom = undefined;
      message.top = '10px';
    }
    postMessageToWindow(MESSAGE_IFRAME_CONTAINER_STYLE, message);
  };

  useEffect(() => {
    const data = (currentMode as BuilderSelectorMode).data;
    const message = {
      enabled: enabledSelector,
      isInput: data?.isInput || false,
    };
    postMessageToWindow(MESSAGE_SELECTOR_SWITCH, message);
  }, [enabledSelector, currentMode]);

  useEffect(() => {
    handleOnPositionChange(true);
  }, []);

  const handleOnCancel = useCallback(() => {
    if (currentMode?.mode === BuilderMode.ELEMENT_SELECTOR && currentMode?.backMode) {
      setCurrentMode({ mode: currentMode.backMode });
    } else {
      setCurrentMode({ mode: BuilderMode.FLOW });
    }
  }, [currentMode]);

  const handleSelectorOutput = useCallback(
    async (data: any) => {
      const { action, idempotentKey, url } = getInitParams() || {};
      let miniUrl = '';
      if (data?.screenshot?.mini) {
        miniUrl = await upload(dataURLtoFile(data.screenshot.mini, 'screenshot-mini.png'));
      }
      if (action === 'elementSelect') {
        const output = { ...data, screenshot: { mini: miniUrl, full: '' } };
        const message = {
          kind: MESSAGE_CRX_SEND_PROXY,
          direction: 'targetToBuilder',
          message: {
            kind: MESSAGE_ELEMENT_SELECT_SUCCESS,
            data: {
              idempotentKey,
              output,
            },
          },
        };
        postProxyMessageToWindow(message, url);
      } else {
        if (currentMode?.mode === BuilderMode.ELEMENT_SELECTOR) {
          const { backMode, mode, ...others } = currentMode;
          if (backMode) {
            setSelectorOutput({
              ...data,
              screenshot: { mini: miniUrl, full: '' },
            });
            setCurrentMode({ mode: backMode, ...others });
          } else {
            setSelectorOutput(data);
            setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
          }
        }
      }
    },
    [currentMode],
  );

  const onMessage = async (e: any) => {
    const { data } = e;
    if (data.kind === MESSAGE_SELECTOR_OUTPUT) {
      handleSelectorOutput(data.data);
    }
  };
  useEvent('message', onMessage, window, { capture: false });

  return (
    <ElementSelector
      onCancel={handleOnCancel}
      isBottom={true}
      enabledSelector={enabledSelector}
      setEnabledSelector={setEnabledSelector}
      onPositionChange={handleOnPositionChange}
    />
  );
};

Selector.displayName = 'Selector';
