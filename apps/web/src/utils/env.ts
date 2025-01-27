import { window } from "@usertour-ui/shared-utils";

declare global {
  interface Window {
    ENV?: {
      API_URL?: string;
      USERTOUR_TOKEN?: string;
      POSTHOG_KEY?: string;
      POSTHOG_HOST?: string;
    };
  }
}

export const apiUrl =
  import.meta.env.VITE_API_URL || window?.ENV?.API_URL || "/graphql";

export const userTourToken =
  import.meta.env.VITE_USERTOUR_TOKEN || window?.ENV?.USERTOUR_TOKEN;

export const posthogKey =
  import.meta.env.VITE_POSTHOG_KEY || window?.ENV?.POSTHOG_KEY;

export const posthogHost =
  import.meta.env.VITE_POSTHOG_HOST || window?.ENV?.POSTHOG_HOST;
