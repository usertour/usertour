const debugEnabled = (localStorage.getItem("debug") || "")
  .split(",")
  .some((v) => v === "*" || v.startsWith("usertour-web:*"));

let lastT: any;
export const debug = (message: any, ...extra: any) => {
  if (debugEnabled) {
    const now = performance.now();
    const t = lastT ? Math.round(now - lastT) : 0;
    lastT = now;
    console.log(
      `%cusertour-web %c${message} %c+${t}ms`,
      "color:#1FDB7D;",
      "",
      "color:#1FDB7D;",
      ...extra
    );
  }
};
