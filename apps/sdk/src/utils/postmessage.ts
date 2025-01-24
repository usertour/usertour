import {
  MESSAGE_CONTENT_PREVIEW_SUCCESS,
  MESSAGE_CRX_SEND_PROXY,
} from "@usertour-ui/constants";
import { window } from "./globals";

export const postPageMessage = (message: any, targetOrigin?: string) => {
  window?.postMessage(message, targetOrigin ?? window?.origin);
};

export const getValidMessage = (e: MessageEvent): any => {
  // Discard untrusted events
  if (!e.isTrusted) {
    return null;
  }
  // Check that message has the right form
  const message = e.data;
  if (
    !message ||
    typeof message !== "object" ||
    typeof message.kind !== "string" ||
    !message.kind.startsWith("usertour:")
  ) {
    // Ignore messages sent by other tools
    return null;
  }
  // Only accept messages from the same window AND same origin
  const sameWindow = e.source === window && e.origin === window.origin;
  if (!sameWindow) {
    console.warn(
      `Usertour crx: Declined handling ${message.kind} message from different window/origin`
    );
    return null;
  }
  return message;
};

export const sendPreviewSuccessMessage = (idempotentKey: string) => {
  const successMessage = {
    kind: MESSAGE_CRX_SEND_PROXY,
    direction: "targetToBuilder",
    message: {
      kind: MESSAGE_CONTENT_PREVIEW_SUCCESS,
      data: {
        idempotentKey,
      },
    },
  };
  window?.postMessage(successMessage, window.location.href);
};
