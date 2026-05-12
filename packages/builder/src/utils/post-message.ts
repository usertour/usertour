import { debug } from './logger';

// var window: Window & typeof globalThis;

export const postMessageToWindow = (kind: string, data: any, host?: string) => {
  if (!window || !window.top) {
    return false;
  }
  debug('towindow message:', kind, data);
  window.top.postMessage({ kind, data }, host || '*');
};

export const postMessageToContainer = (kind: string, data: any, host?: string) => {
  const iframe = window?.top?.document.querySelector(
    '#usertour-iframe-container',
  ) as HTMLIFrameElement;
  debug('tocontainer message:', kind, data);
  if (!iframe || !iframe.contentWindow) {
    return false;
  }
  iframe.contentWindow.postMessage({ kind, data }, host || '*');
};

export const postProxyMessageToContainer = (message: any, host?: string) => {
  if (!window || !window.top) {
    return false;
  }
  const iframe = window.top.document.querySelector(
    '#usertour-iframe-container',
  ) as HTMLIFrameElement;
  debug('tocontainer proxy message:', message);
  if (!iframe || !iframe.contentWindow) {
    return false;
  }
  iframe.contentWindow.postMessage(message, host || '*');
};

export const postProxyMessageToWindow = (message: any, host?: string) => {
  debug('towindow proxy message:', message);
  if (!window || !window.top) {
    return false;
  }
  window.top.postMessage(message, host || '*');
};
