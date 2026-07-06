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
 * Replace loader stubs left on the merged object by methods this SDK build
 * doesn't implement (e.g. setScrollPadding, setServerEndpoint — the loader
 * stubs the full historical API surface).
 *
 * This is load-bearing, not cosmetic: a leftover stub still closes over the
 * loader's queue array and RE-PUSHES on every call. Since `methodName in
 * usertour` is true for a leftover stub, processStubQueue's invalid-method
 * guard never fires — it calls the stub, the stub appends to the very array
 * being iterated, and the for...of (which re-reads length each step) becomes
 * a synchronous infinite loop that pegs the main thread and grows the queue
 * until the tab OOMs. One pre-init call to any unimplemented method was
 * enough. (This was also the root cause of the long-standing "calling
 * setServerEndpoint() hangs the page" report.) Neutralizing the stubs also
 * fixes the quieter post-load case: calls no longer vanish into an orphaned
 * queue nobody drains — they warn instead.
 */
function neutralizeLeftoverStubs(
  target: UserTourTypes.Usertour,
  api: UserTourTypes.Usertour,
): void {
  const record = target as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (typeof record[key] === 'function' && !(key in api)) {
      record[key] = () => {
        logger.warn(`usertour.js: '${key}' is not supported by this SDK build — call ignored`);
      };
    }
  }
}

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

  // Drain into a snapshot: loader stubs keep a closure on this same array, so
  // iterating it live lets anything that re-pushes extend the loop unboundedly
  // (for...of re-reads length every step). splice also empties the loader's
  // captured reference, so nothing can accumulate in an orphaned queue.
  const items = stubQueue.splice(0, stubQueue.length);

  for (const [method, deferred, args] of items) {
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
 * Creates API methods bound to the UsertourCore instance
 */
function createUsertourAPI(app: UsertourCore): UserTourTypes.Usertour {
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
      return await app.track(name, attributes, opts);
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

    setCustomScrollIntoView: (customScrollIntoView: ((el: Element) => void) | null) => {
      app.setCustomScrollIntoView(customScrollIntoView);
    },

    setUrlFilter: (urlFilter: ((url: string) => string) | null) => {
      app.setUrlFilter(urlFilter);
    },

    setLinkUrlDecorator: (linkUrlDecorator: ((url: string) => string) | null) => {
      app.setLinkUrlDecorator(linkUrlDecorator);
    },

    disableEvalJs: () => {
      app.disableEvalJs();
    },

    registerCustomInput: (cssSelector: string, getValue?: (el: Element) => string) => {
      app.registerCustomInput(cssSelector, getValue);
    },

    openResourceCenter: () => {
      app.openResourceCenter();
    },

    closeResourceCenter: () => {
      app.closeResourceCenter();
    },

    toggleResourceCenter: () => {
      app.toggleResourceCenter();
    },

    showResourceCenterLauncher: () => {
      app.showResourceCenterLauncher();
    },

    hideResourceCenterLauncher: () => {
      app.hideResourceCenterLauncher();
    },

    isResourceCenterOpen: () => {
      return app.isResourceCenterOpen();
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
  const usertour: UserTourTypes.Usertour = Object.assign(w.usertour || {}, api);

  // Any function the merge preserved that api doesn't define is a leftover
  // loader stub — replace it BEFORE draining the queue (see the helper's
  // comment: a live stub turns the drain into an infinite loop).
  neutralizeLeftoverStubs(usertour, api);

  w.usertour = usertour;

  // Process any queued method calls that occurred before initialization
  processStubQueue(w.usertour, w.USERTOURJS_QUEUE);
}
