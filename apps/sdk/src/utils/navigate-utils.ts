import { logger } from "./logger";

interface UserInfo {
  data: Record<string, string>;
}

export function buildNavigateUrl(value: any[], userInfo?: UserInfo): string {
  let url = "";

  try {
    value.forEach((v: any) => {
      v.children.forEach((vc: any) => {
        if (vc.type === "user-attribute") {
          if (userInfo) {
            url += userInfo.data[vc.attrCode] || vc.fallback;
          }
        } else {
          url += vc.text;
        }
      });
    });

    return url;
  } catch (error) {
    logger.error("Build navigate URL error: ", error);
    return "";
  }
}
