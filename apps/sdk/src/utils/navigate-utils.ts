import { logger } from './logger';

interface UserInfo {
  data: Record<string, string>;
}

export function buildNavigateUrl(value: any[], userInfo?: UserInfo): string {
  let url = '';

  try {
    for (const v of value) {
      for (const vc of v.children) {
        if (vc.type === 'user-attribute') {
          if (userInfo) {
            url += userInfo.data[vc.attrCode] || vc.fallback;
          }
        } else {
          url += vc.text;
        }
      }
    }

    return url;
  } catch (error) {
    logger.error('Build navigate URL error: ', error);
    return '';
  }
}
