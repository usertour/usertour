let lastT: any;
export const isDebugEnabled = () => {
  return (localStorage.getItem('debug') || sessionStorage.getItem('debug') || '')
    .split(',')
    .some((v) => v === '*' || v.startsWith('usertour-ext:*'));
};

export const debug = (message: any, ...extra: any) => {
  if (isDebugEnabled()) {
    const now = performance.now();
    const t = lastT ? Math.round(now - lastT) : 0;
    lastT = now;
    console.log(
      `%cusertour-extension %c${message} %c+${t}ms`,
      'color:#1FDB7D;',
      '',
      'color:#1FDB7D;',
      ...extra,
    );
  }
};
