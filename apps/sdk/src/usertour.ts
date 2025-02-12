import { SDKSettingsMode, UserTourTypes } from '@usertour-ui/types';
import { App } from './core/app';
import { logger } from './utils/logger';

const w: UserTourTypes.WindowWithUsertour = typeof window === 'undefined' ? ({} as any) : window;

if (w.usertour === undefined || w.usertour?._stubbed) {
  const app = new App();
  const usertour = Object.assign(
    w.usertour || {},
    (() => {
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
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          opts?: UserTourTypes.IdentifyOptions,
        ) => {
          return await app.identify(userId, { ...attributes });
        },
        identifyAnonymous: async (
          attributes?: UserTourTypes.Attributes,
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          opts?: UserTourTypes.IdentifyOptions,
        ) => {
          return await app.identifyAnonymous(attributes);
        },
        updateUser: async (
          attributes: UserTourTypes.Attributes,
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          opts?: UserTourTypes.IdentifyOptions,
        ) => {
          return await app.updateUser(attributes);
        },
        group: async (
          groupId: string,
          attributes?: UserTourTypes.Attributes,
          opts?: UserTourTypes.GroupOptions,
        ) => {
          return await app.group(groupId, attributes, opts);
        },
        updateGroup: async (
          attributes: UserTourTypes.Attributes,
          opts?: UserTourTypes.GroupOptions,
        ) => {
          return await app.updateGroup(attributes, opts);
        },
        track: async (
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          name: string,
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          attributes?: UserTourTypes.EventAttributes,
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          opts?: UserTourTypes.TrackOptions,
        ) => {},
        isIdentified: () => {
          return app.isIdentified();
        },
        start: async (
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          contentId: string,
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          opts?: UserTourTypes.StartOptions,
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
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          eventName: string,
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          listener: (...args: any[]) => void,
        ) => {},
        // eslint-disable-next-line es5/no-rest-parameters
        off: (
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          eventName: string,
          //@ts-ignore
          // biome-ignore lint/correctness/noUnusedVariables: <explanation>
          listener: (...args: any[]) => void,
        ) => {},
      };
    })(),
  );

  w.usertour = usertour;

  (() => {
    const ut = w.usertour;
    const stubQueue = w.USERTOURJS_QUEUE;
    if (!stubQueue || stubQueue.length === 0) {
      return;
    }
    // @ts-ignore
    logger.info(`processing ${stubQueue.length} items in the queue`);
    w.USERTOURJS_QUEUE = undefined;
    for (const [method, deferred, args] of stubQueue) {
      const m = method as keyof typeof ut;
      if (typeof ut[m] !== 'function') {
        console.error(`usertour.js: Invalid method '${m}' in queue`);
        continue;
      }
      // @ts-ignore
      const t = ut[m](...args) as any;
      if (deferred && typeof t.then === 'function') {
        t.then(deferred.resolve, deferred.reject);
      }
    }
    logger.info('queue processed');
  })();
}
// export default usertour;
