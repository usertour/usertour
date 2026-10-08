// Loader stub for the HTML-snippet install. Mirror of
// usertour.js/dist/usertour.snippet.min.js (that repo is the source of truth);
// keep it in sync if the loader changes. It carries no token — the token is
// passed to usertour.init() in the install code below it. String.raw keeps the
// regex backslashes intact (a plain template literal would eat them).
export const USERTOUR_LOADER_SNIPPET = String.raw`!function(){var e="undefined"==typeof window?{}:window,r=e.usertour;if(!r){var t="https://js.usertour.io/",n=null;r=e.usertour={_stubbed:!0,load:function(){return n||(n=new Promise((function(r,o){var s=document.createElement("script");s.async=!0;var u=e.USERTOURJS_ENV_VARS||{};"es2020"===(u.USERTOURJS_BROWSER_TARGET||function(e){for(var r=[[/Edg\//,/Edg\/(\d+)/,80],[/OPR\//,/OPR\/(\d+)/,67],[/Chrome\//,/Chrome\/(\d+)/,80],[/CriOS\//,/CriOS\/(\d+)/,100],[/Safari\//,/Version\/(\d+)/,14],[/Firefox\//,/Firefox\/(\d+)/,74]],t=0;t<r.length;t++){var n=r[t],o=n[0],s=n[1],u=n[2];if(e.match(o)){var i=e.match(new RegExp(s));if(i&&parseInt(i[1],10)>=u)return"es2020";break}}return"legacy"}(navigator.userAgent))?(s.type="module",s.src=u.USERTOURJS_ES2020_URL||t+"es2020/usertour.js"):s.src=u.USERTOURJS_LEGACY_URL||t+"legacy/usertour.iife.js",s.onload=function(){r()},s.onerror=function(){document.head.removeChild(s),n=null;var e=new Error("Could not load Usertour.js");console.warn(e.message),o(e)},document.head.appendChild(s)}))),n}};var o=e.USERTOURJS_QUEUE=e.USERTOURJS_QUEUE||[],s=function(){var r=e.usertour;return e.USERTOURJS_QUEUE===o&&!!r&&r._stubbed},u=function(e){console.warn("usertour.js: "+e+" is not supported and was ignored")},i=function(e){r[e]=function(){if(s()){var t=Array.prototype.slice.call(arguments);r.load(),o.push([e,null,t])}else u(e)}},a=function(e){r[e]=function(){if(!s())return u(e),Promise.reject(new Error("usertour.js: "+e+" is not supported"));var t,n=Array.prototype.slice.call(arguments);r.load();var i=new Promise((function(e,r){t={resolve:e,reject:r}}));return o.push([e,t,n]),i}},c=function(e,t){r[e]=function(){return t}},d=function(e){r[e]=function(){u(e)}};i("disableEvalJs"),i("init"),i("off"),i("on"),i("registerCustomInput"),i("reset"),i("setBaseZIndex"),i("setTargetMissingSeconds"),i("setDebug"),i("setCustomNavigate"),i("setCustomScrollIntoView"),i("setUrlFilter"),i("setLinkUrlDecorator"),i("openResourceCenter"),i("closeResourceCenter"),i("toggleResourceCenter"),i("showResourceCenterLauncher"),i("hideResourceCenterLauncher"),d("setCustomInputSelector"),d("setSessionTimeout"),d("setInferenceAttributeFilter"),d("setInferenceAttributeNames"),d("setInferenceClassNameFilter"),d("setScrollPadding"),d("setServerEndpoint"),d("setShadowDomEnabled"),d("setPageTrackingDisabled"),a("endAll"),a("group"),a("identify"),a("identifyAnonymous"),a("start"),a("track"),a("updateGroup"),a("updateUser"),c("isIdentified",!1),c("isResourceCenterOpen",!1),c("isStarted",!1)}}();`;

export const NPM_INSTALL_COMMAND = 'npm install usertour.js';

const identifyBlock = `usertour.identify('USER_ID', {
  name: 'USER_NAME',
  email: 'USER_EMAIL',
  signed_up_at: 'USER_SIGNED_UP_AT',
});`;

/** NPM-style init code; the token is the selected environment's token. */
export const buildNpmCode = (token: string): string =>
  `import usertour from 'usertour.js';

usertour.init('${token}');
${identifyBlock}`;

/**
 * HTML-snippet install. `envVarsBlock`, when present (self-hosted), is the
 * USERTOURJS_ENV_VARS <script> that must precede the loader so the SDK points
 * at the self-hosted server instead of js.usertour.io.
 */
export const buildHtmlCode = (token: string, envVarsBlock?: string): string => {
  const head = envVarsBlock ? `${envVarsBlock}\n\n` : '';
  return `${head}<script>
${USERTOUR_LOADER_SNIPPET}

usertour.init('${token}');
${identifyBlock}
</script>`;
};

/** Self-hosted env-vars <script>, derived from the deployment's API URL. */
export const buildSelfHostedEnvVars = (apiUrl: string): string => {
  const base = apiUrl.replace(/\/+$/, '');
  return `<script>
  window.USERTOURJS_ENV_VARS = {
    WS_URI: "${base}/",
    ASSETS_URI: "${base}/sdk",
    USERTOURJS_ES2020_URL: "${base}/sdk/es2020/usertour.js",
    USERTOURJS_LEGACY_URL: "${base}/sdk/legacy/usertour.iife.js",
  };
</script>`;
};
