import { document } from './globals';

export const extensionIsRunning = () => {
  const el = document?.querySelector('#usertour-iframe-container') as HTMLIFrameElement;

  if (!el) {
    return false;
  }

  return el?.dataset?.started === 'true';
};
