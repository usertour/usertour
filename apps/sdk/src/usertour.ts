import { SDKSettingsMode, UserTourTypes } from "@usertour-ui/types";
import { App } from "./core/app";
import { logger } from "./utils/logger";

var w: UserTourTypes.WindowWithUsertour =
  typeof window === "undefined" ? ({} as any) : window;

if (w.usertour === undefined || w.usertour?._stubbed) {
  const app = new App();
  const usertour = Object.assign(
    w.usertour || {},
    (function () {
      return {
        _stubbed: false,
        _app: app,
        load: async () => {},
        init: (token: string) => {
          return app.init({
            token,
            mode: SDKSettingsMode.NORMAL,
          });
        },
        identify: async (
          userId: string,
          attributes?: UserTourTypes.Attributes,
          //@ts-ignore
          opts?: UserTourTypes.IdentifyOptions
        ) => {
          return await app.identify(userId, { ...attributes });
        },
        identifyAnonymous: async (
          attributes?: UserTourTypes.Attributes,
          //@ts-ignore
          opts?: UserTourTypes.IdentifyOptions
        ) => {
          return await app.identifyAnonymous(attributes);
        },
        updateUser: async (
          attributes: UserTourTypes.Attributes,
          //@ts-ignore
          opts?: UserTourTypes.IdentifyOptions
        ) => {
          return await app.updateUser(attributes);
        },
        group: async (
          groupId: string,
          attributes?: UserTourTypes.Attributes,
          opts?: UserTourTypes.GroupOptions
        ) => {
          return await app.group(groupId, attributes, opts);
        },
        updateGroup: async (
          attributes: UserTourTypes.Attributes,
          opts?: UserTourTypes.GroupOptions
        ) => {
          return await app.updateGroup(attributes, opts);
        },
        track: async (
          // @ts-ignore
          name: string,
          // @ts-ignore
          attributes?: UserTourTypes.EventAttributes,
          // @ts-ignore
          opts?: UserTourTypes.TrackOptions
        ) => {},
        isIdentified: () => {
          return app.isIdentified();
        },
        start: async (
          // @ts-ignore
          contentId: string,
          // @ts-ignore
          opts?: UserTourTypes.StartOptions
        ) => {},
        endAll: async () => {
          return await app.endAll();
        },
        reset: () => {
          app.reset();
        },
        remount: () => {},
        setBaseZIndex: (baseZIndex: number) => {
          app.setBaseZIndex(baseZIndex);
        },
        // eslint-disable-next-line es5/no-rest-parameters
        on: (
          // @ts-ignore
          eventName: string,
          // @ts-ignore
          listener: (...args: any[]) => void
        ) => {},
        // eslint-disable-next-line es5/no-rest-parameters
        off: (
          // @ts-ignore
          eventName: string,
          // @ts-ignore
          listener: (...args: any[]) => void
        ) => {},
      };
    })()
  );

  w.usertour = usertour;

  (function () {
    const ut = w.usertour;
    const stubQueue = w.USERTOURJS_QUEUE;
    if (!stubQueue || stubQueue.length == 0) {
      return;
    }
    // @ts-ignore
    logger.info(`processing ${stubQueue.length} items in the queue`);
    delete w.USERTOURJS_QUEUE;
    for (const [method, deferred, args] of stubQueue) {
      const m = method as keyof typeof ut;
      if ("function" != typeof ut[m]) {
        console.error(`usertour.js: Invalid method '${m}' in queue`);
        continue;
      }
      // @ts-ignore
      const t = ut[m](...args) as any;
      if (deferred && "function" == typeof t.then) {
        t.then(deferred.resolve, deferred.reject);
      }
    }
    logger.info("queue processed");
  })();
}
// export default usertour;
