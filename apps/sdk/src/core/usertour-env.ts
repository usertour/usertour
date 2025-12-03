import { UserTourTypes } from '@usertour/types';
import { window } from '../utils/globals';

export const getWsUri = () => {
  return getUsertourEnvVars('WS_URI') || import.meta.env.VITE_WS_URI;
};

const getAssetsUri = () => {
  return getUsertourEnvVars('ASSETS_URI') || import.meta.env.VITE_ASSETS_URI;
};

export const getMainCss = () => {
  // @ts-ignore: USERTOUR_APP_MAIN_CSS is injected by vite
  const mainCss =
    typeof USERTOUR_APP_MAIN_CSS !== 'undefined' ? USERTOUR_APP_MAIN_CSS : '/css/index.css';
  return getAssetsUri() + mainCss;
};

export const getUserTourCss = () => {
  // @ts-ignore: USERTOUR_APP_USER_TOUR_CSS is injected by vite
  const userTourCss =
    typeof USERTOUR_APP_USER_TOUR_CSS !== 'undefined'
      ? USERTOUR_APP_USER_TOUR_CSS
      : '/css/usertour.css';
  return getAssetsUri() + userTourCss;
};

const getUsertourEnvVars = (key: string) => {
  const w: UserTourTypes.WindowWithUsertour = typeof window === 'undefined' ? ({} as any) : window;
  const envVars = w.USERTOURJS_ENV_VARS || {};
  return envVars[key];
};
