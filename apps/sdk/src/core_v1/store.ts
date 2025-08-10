import autoBind from '../utils/auto-bind';
import isEqual from 'fast-deep-equal';

/**
 * A generic store class that manages state and notifies subscribers of changes
 */
export class ExternalStore<T> {
  // Stores the current state
  private data: T | undefined;
  // Set of subscriber callback functions
  private listeners: Set<() => void>;

  /**
   * Creates a new store instance with initial data
   * @param initial The initial state value
   */
  constructor(initial: T | undefined) {
    this.listeners = new Set();
    this.data = initial;
    autoBind(this);
  }

  /**
   * Replaces the entire state with new data
   * Only emits change if the data has actually changed
   * @param newData New state to set
   */
  public setData(newData: T | undefined): void {
    // Only update and emit if data has actually changed
    if (!isEqual(this.data, newData)) {
      this.data = newData;
      this.emitChange();
    }
  }

  /**
   * Updates a portion of the state by merging partial data
   * Only emits change if the data has actually changed
   * @param partialData Partial state to merge with current state
   */
  public update(partialData: Partial<T>): void {
    if (this.data) {
      const newData = { ...this.data, ...partialData };
      // Only update and emit if data has actually changed
      if (!isEqual(this.data, newData)) {
        this.data = newData;
        this.emitChange();
      }
    }
  }

  /**
   * Subscribes to state changes and returns an unsubscribe function
   * @param listener Callback function to be called on state changes
   * @returns Function to unsubscribe the listener
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Returns the current state
   * @returns Current state value
   */
  public getSnapshot(): T | undefined {
    return this.data;
  }

  /**
   * Notifies all subscribers of state changes
   */
  private emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
