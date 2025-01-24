import { MESSAGE_CRX_PING, MESSAGE_CRX_PONG } from "@usertour-ui/constants";

export const isInstalledExtension = async () => {
  let isInstalled = false;
  return new Promise(function (resolve: (installed: boolean) => void) {
    const pageMessageListener = (e: MessageEvent) => {
      // Discard untrusted events
      if (!e.isTrusted) {
        return;
      }
      const message = e.data;
      if (message && message.kind === MESSAGE_CRX_PONG) {
        isInstalled = true;
      }
    };
    window.addEventListener("message", pageMessageListener);
    window.postMessage({ kind: MESSAGE_CRX_PING }, window.location.href);
    let count = 0;
    let timer = setInterval(() => {
      if (isInstalled) {
        resolve(true);
        clearInterval(timer);
      }
      if (count >= 3) {
        resolve(false);
        clearInterval(timer);
      }
      count++;
    }, 100);
  }).then(function (isLoaded: boolean) {
    return isLoaded;
  });
};
