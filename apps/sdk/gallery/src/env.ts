import type { UserTourTypes } from '@usertour/types';
import { getMainCss } from '@/core/usertour-env';
import { loadStylesheet } from '@/utils/loader';

// Must match SDK_ASSETS_PREFIX in ../vite.config.ts.
const SDK_ASSETS_PREFIX = '/sdk-dist';

/**
 * Points the SDK's asset resolution at the gallery's copy of the built CSS —
 * the same knob a self-hosted install turns (USERTOURJS_ENV_VARS.ASSETS_URI).
 */
export const configureSdkEnv = () => {
  (window as UserTourTypes.WindowWithUsertour).USERTOURJS_ENV_VARS = {
    ASSETS_URI: `${window.location.origin}${SDK_ASSETS_PREFIX}`,
  };
};

/** Loads the host-page stylesheet exactly the way the SDK does on a customer page. */
export const loadHostStylesheet = async () => {
  const cssFile = getMainCss();
  if (!(await loadStylesheet(cssFile, document))) {
    throw new Error(`Failed to load ${cssFile}`);
  }
};
