import { SDKSettingsMode, UserTourTypes } from '@usertour-ui/types';
import { App } from './core/app';
import { logger } from './utils/logger';
import { window } from './utils/globals';

const w: UserTourTypes.WindowWithUsertour = typeof window === 'undefined' ? ({} as any) : window;

interface Deferred {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

type QueueItem = [string, Deferred | null, unknown[]];

/**
 * Process the queue of method calls that were collected before SDK initialization
 */
function processStubQueue(usertour: UserTourTypes.Usertour, stubQueue?: QueueItem[]): void {
  if (!stubQueue?.length) {
    return;
  }

  logger.info(`Processing ${stubQueue.length} items in the queue`);

  // Clear the queue immediately to prevent double processing
  (window as any).USERTOURJS_QUEUE = undefined;

  for (const [method, deferred, args] of stubQueue) {
    try {
      const methodName = method as keyof typeof usertour;

      if (typeof usertour[methodName] !== 'function') {
        logger.error(`usertour.js: Invalid method '${methodName}' in queue`);
        continue;
      }

      const result = (usertour[methodName] as (...args: unknown[]) => unknown)(...args);

      if (deferred && result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).then(deferred.resolve, deferred.reject);
      }
    } catch (error) {
      logger.error(`Error processing queue item for method '${method}':`, error);
      deferred?.reject?.(error);
    }
  }

  logger.info('Queue processed successfully');
}

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
        /**
         * Checks if a user is identified
         * @returns True if user info exists, false otherwise
         */
        isIdentified: () => {
          return app.isIdentified();
        },
        /**
         * Checks if a content has been started
         * @param contentId - The content ID to check
         * @returns True if the content has been started, false otherwise
         */
        isStarted: (contentId: string) => {
          return app.isStarted(contentId);
        },
        /**
         * Starts a content
         * @param contentId - The content ID to start
         * @param opts - The options for starting the content
         * @returns A promise that resolves when the content is started
         */
        start: async (contentId: string, opts?: UserTourTypes.StartOptions) => {
          return app.startContent(contentId, opts);
        },
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
        setSessionTimeout: (hours: number) => {
          app.setSessionTimeout(hours);
        },
        setTargetMissingSeconds: (seconds: number) => {
          app.setTargetMissingSeconds(seconds);
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
    processStubQueue(w.usertour, w.USERTOURJS_QUEUE);
  })();
}

// export default usertour;
