// Define more specific types for better type safety
export type EventHandler = (...args: unknown[]) => void;
export type EventBinding = {
  handler: EventHandler;
  ctx?: unknown;
  once?: boolean;
};

export class Evented {
  // Use Map instead of plain object for better performance
  private bindings: Map<string, EventBinding[]> = new Map();

  /**
   * Adds an event listener for the given event string.
   *
   * @param {string} event
   * @param {Function} handler
   * @param ctx
   * @param {boolean} once
   * @returns
   */
  on(event: string, handler: EventHandler, ctx?: unknown, once = false): this {
    if (!this.bindings.has(event)) {
      this.bindings.set(event, []);
    }

    this.bindings.get(event)?.push({ handler, ctx, once });
    return this;
  }

  /**
   * Adds an event listener that only fires once for the given event string.
   *
   * @param {string} event
   * @param {Function} handler
   * @param ctx
   * @returns
   */
  once(event: string, handler: EventHandler, ctx?: unknown): this {
    return this.on(event, handler, ctx, true);
  }

  /**
   * Removes an event listener for the given event string.
   *
   * @param {string} event
   * @param {Function} handler
   * @returns
   */
  off(event: string, handler?: EventHandler): this {
    if (!this.bindings.has(event)) {
      return this;
    }

    if (!handler) {
      this.bindings.delete(event);
      return this;
    }

    // Get current bindings
    const bindings = this.bindings.get(event);
    if (bindings) {
      // Filter out the handler we want to remove
      const filteredBindings = bindings.filter(
        (binding) => binding.handler !== handler
      );
      if (filteredBindings.length === 0) {
        this.bindings.delete(event);
      } else {
        this.bindings.set(event, filteredBindings);
      }
    }

    return this;
  }

  /**
   * Triggers an event listener for the given event string.
   *
   * @param {string} event
   * @returns
   */
  trigger(event: string, ...args: unknown[]): this {
    const bindings = this.bindings.get(event);

    if (bindings?.length) {
      // Create a copy of bindings to safely handle removal during iteration
      const bindingsCopy = [...bindings];

      // Filter out 'once' handlers after execution
      const remainingBindings = bindingsCopy.filter((binding) => {
        const { handler, ctx, once } = binding;
        handler.apply(ctx || this, args);
        return !once;
      });

      if (remainingBindings.length === 0) {
        this.bindings.delete(event);
      } else {
        this.bindings.set(event, remainingBindings);
      }
    }

    return this;
  }
}
