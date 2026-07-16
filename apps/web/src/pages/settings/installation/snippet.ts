// Loader stub for the HTML-snippet install. Mirror of
// usertour.js/dist/usertour.snippet.min.js (that repo is the source of truth);
// keep it in sync if the loader changes. It carries no token — the token is
// passed to usertour.init() in the install code below it. String.raw keeps the
// regex backslashes intact (a plain template literal would eat them).
export const USERTOUR_LOADER_SNIPPET = String.raw`!function(){var e="undefined"==typeof window?{}:window,r=e.usertour;if(!r){var t="https://js.usertour.io/",n=null;r=e.usertour={_stubbed:!0,load:function(){return n||(n=new Promise((function(r,o){var s=document.createElement("script");s.async=!0;var i=e.USERTOURJS_ENV_VARS||{};"es2020"===(i.USERTOURJS_BROWSER_TARGET||function(e){for(var r=[[/Edg\//,/Edg\/(\d+)/,80],[/OPR\//,/OPR\/(\d+)/,67],[/Chrome\//,/Chrome\/(\d+)/,80],[/CriOS\//,/CriOS\/(\d+)/,100],[/Safari\//,/Version\/(\d+)/,14],[/Firefox\//,/Firefox\/(\d+)/,74]],t=0;t<r.length;t++){var n=r[t],o=n[0],s=n[1],i=n[2];if(e.match(o)){var u=e.match(new RegExp(s));if(u&&parseInt(u[1],10)>=i)return"es2020";break}}return"legacy"}(navigator.userAgent))?(s.type="module",s.src=i.USERTOURJS_ES2020_URL||t+"es2020/usertour.js"):s.src=i.USERTOURJS_LEGACY_URL||t+"legacy/usertour.iife.js",s.onload=function(){r()},s.onerror=function(){document.head.removeChild(s),n=null;var e=new Error("Could not load Usertour.js");console.warn(e.message),o(e)},document.head.appendChild(s)}))),n}};var o=e.USERTOURJS_QUEUE=e.USERTOURJS_QUEUE||[],s=function(e){r[e]=function(){var t=Array.prototype.slice.call(arguments);r.load(),o.push([e,null,t])}},i=function(e){r[e]=function(){var t,n=Array.prototype.slice.call(arguments);r.load();var s=new Promise((function(e,r){t={resolve:e,reject:r}}));return o.push([e,t,n]),s}},u=function(e,t){r[e]=function(){return t}},a=function(e){r[e]=function(){console.warn("usertour.js: "+e+" is not supported and was ignored")}};s("disableEvalJs"),s("init"),s("off"),s("on"),s("registerCustomInput"),s("reset"),s("setBaseZIndex"),s("setTargetMissingSeconds"),s("setCustomNavigate"),s("setCustomScrollIntoView"),s("setUrlFilter"),s("setLinkUrlDecorator"),s("openResourceCenter"),s("closeResourceCenter"),s("toggleResourceCenter"),s("showResourceCenterLauncher"),s("hideResourceCenterLauncher"),a("setCustomInputSelector"),a("setSessionTimeout"),a("setInferenceAttributeFilter"),a("setInferenceAttributeNames"),a("setInferenceClassNameFilter"),a("setScrollPadding"),a("setServerEndpoint"),a("setShadowDomEnabled"),a("setPageTrackingDisabled"),i("endAll"),i("group"),i("identify"),i("identifyAnonymous"),i("start"),i("track"),i("updateGroup"),i("updateUser"),u("isIdentified",!1),u("isResourceCenterOpen",!1),u("isStarted",!1)}}();`;

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
    ASSETS_URI: "${base}/sdk/",
    USERTOURJS_ES2020_URL: "${base}/sdk/es2020/usertour.js",
    USERTOURJS_LEGACY_URL: "${base}/sdk/legacy/usertour.iife.js",
  };
</script>`;
};
