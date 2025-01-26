import { UserTourTypes } from "@usertour-ui/types";
import { window } from "./globals";

const getWsUri = () => {
  return getUsertourEnvVars("WS_URI") || import.meta.env.VITE_WS_URI;
};

const getAssetsUri = () => {
  return getUsertourEnvVars("ASSETS_URI") || import.meta.env.VITE_ASSETS_URI;
};

const getMainCss = () => {
  return getAssetsUri() + USERTOUR_APP_MAIN_CSS;
};

const getUserTourCss = () => {
  return getAssetsUri() + USERTOUR_APP_USER_TOUR_CSS;
};

const getUsertourEnvVars = (key: string) => {
  const w: UserTourTypes.WindowWithUsertour =
    typeof window === "undefined" ? ({} as any) : window;
  const envVars = w.USERTOURJS_ENV_VARS || {};
  return envVars[key];
};

export { getWsUri, getMainCss, getUserTourCss };
