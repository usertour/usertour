export type RecordedCall = {
  method: string;
  args: unknown[];
};

declare global {
  interface Window {
    /** Every call a widget made on its (fake) SDK instance, in order. Read by the e2e tests. */
    __galleryCalls: RecordedCall[];
  }
}

window.__galleryCalls = [];

/** Records a widget → instance call; args are deep-copied so later mutation can't rewrite history. */
export const recordCall = (method: string, ...args: unknown[]) => {
  window.__galleryCalls.push({ method, args: JSON.parse(JSON.stringify(args)) });
};
