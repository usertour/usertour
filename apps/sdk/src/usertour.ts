import { contentStartReason, SDKSettingsMode, UserTourTypes } from '@usertour/types';
import { UsertourCore } from './core/usertour-core';
import { logger, window } from '@/utils';

type WindowWithUsertour = UserTourTypes.WindowWithUsertour;

const w: WindowWithUsertour =
  typeof window === 'undefined' ? ({} as WindowWithUsertour) : (window as WindowWithUsertour);

interface Deferred {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

type QueueItem = [string, Deferred | null, unknown[]];

/**
 * Process the queue of method calls that were collected before SDK initialization
 * @param usertour - The initialized usertour instance
 * @param stubQueue - Queue of method calls to process
 */
function processStubQueue(usertour: UserTourTypes.Usertour, stubQueue?: QueueItem[]): void {
  if (!stubQueue?.length) {
    return;
  }

  logger.info(`Processing ${stubQueue.length} items in the queue`);

  // Clear the queue immediately to prevent double processing
  if (w.USERTOURJS_QUEUE) {
    w.USERTOURJS_QUEUE = undefined;
  }

  for (const [method, deferred, args] of stubQueue) {
    try {
      const methodName = method as keyof UserTourTypes.Usertour;

      // Type-safe method check
      if (!(methodName in usertour) || typeof usertour[methodName] !== 'function') {
        logger.error(`usertour.js: Invalid method '${methodName}' in queue`);
        deferred?.reject?.(new Error(`Invalid method: ${methodName}`));
        continue;
      }

      const methodFn = usertour[methodName] as (...args: unknown[]) => unknown;
      const result = methodFn(...args);

      // Handle promise-based methods
      if (deferred) {
        if (result instanceof Promise) {
          result.then(deferred.resolve, deferred.reject).catch(deferred.reject);
        } else {
          deferred.resolve(result);
        }
      }
    } catch (error) {
      logger.error(`Error processing queue item for method '${method}':`, error);
      deferred?.reject?.(error);
    }
  }

  logger.info('Queue processed successfully');
}

/**
 * Extended Usertour interface with internal properties and additional methods
 * These methods are implemented but not yet in the public type definition
 */
interface UsertourWithInternal extends UserTourTypes.Usertour {
  setTargetMissingSeconds?: (seconds: number) => void;
  setCustomNavigate?: (customNavigate: ((url: string) => void) | null) => void;
}

/**
 * Creates API methods bound to the UsertourCore instance
 */
function createUsertourAPI(app: UsertourCore): UsertourWithInternal {
  return {
    _stubbed: false,

    load: async () => {
      // Intentionally empty - reserved for future use
    },

    init: (token: string) => {
      return app.init({
        token,
        mode: SDKSettingsMode.NORMAL,
      });
    },

    identify: async (userId: string, attributes?: UserTourTypes.Attributes) => {
      return await app.identify(userId, attributes);
    },

    identifyAnonymous: async (attributes?: UserTourTypes.Attributes) => {
      return await app.identifyAnonymous(attributes);
    },

    updateUser: async (attributes: UserTourTypes.Attributes) => {
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
      attributes?: UserTourTypes.Attributes,
      opts?: UserTourTypes.GroupOptions,
    ) => {
      return await app.updateGroup(attributes, opts);
    },

    track: async (
      name: string,
      attributes?: UserTourTypes.EventAttributes,
      opts?: UserTourTypes.TrackOptions,
    ) => {
      // Intentionally empty - reserved for future event tracking
      logger.warn('track method is not yet implemented', { name, attributes, opts });
    },

    isIdentified: () => {
      return app.isIdentified();
    },

    isStarted: (contentId: string) => {
      return app.isStarted(contentId);
    },

    start: async (contentId: string, opts?: UserTourTypes.StartOptions) => {
      return app.startContent(contentId, contentStartReason.START_FROM_PROGRAM, opts);
    },

    endAll: async () => {
      return await app.endAll();
    },

    reset: () => {
      app.reset();
    },

    remount: () => {
      // Intentionally empty - reserved for future remount functionality
      logger.warn('remount method is not yet implemented');
    },

    setBaseZIndex: (baseZIndex: number) => {
      app.setBaseZIndex(baseZIndex);
    },

    setTargetMissingSeconds: (seconds: number) => {
      app.setTargetMissingSeconds(seconds);
    },

    setCustomNavigate: (customNavigate: ((url: string) => void) | null) => {
      app.setCustomNavigate(customNavigate);
    },

    on: (eventName: string, _listener: (...args: any[]) => void) => {
      // Intentionally empty - reserved for future event system
      logger.warn('on method is not yet implemented', { eventName });
    },

    off: (eventName: string, _listener: (...args: any[]) => void) => {
      // Intentionally empty - reserved for future event system
      logger.warn('off method is not yet implemented', { eventName });
    },
  };
}

// Initialize SDK if not already initialized or if it's a stubbed version
if (w.usertour === undefined || w.usertour?._stubbed) {
  const app = new UsertourCore();
  const api = createUsertourAPI(app);

  // Preserve any existing methods if merging with a stubbed version
  const usertour: UsertourWithInternal = Object.assign(w.usertour || {}, api);

  w.usertour = usertour;

  // Process any queued method calls that occurred before initialization
  processStubQueue(w.usertour, w.USERTOURJS_QUEUE);
}
