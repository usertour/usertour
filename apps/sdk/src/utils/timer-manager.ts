import { logger } from '@/utils';

/**
 * Timer task interface
 */
interface TimerTask {
  id: string;
  callback: () => Promise<void> | void;
  interval: number;
  lastRun: number;
  enabled: boolean;
}

/**
 * Heartbeat monitor interface
 */
interface HeartbeatOptions {
  interval: number;
  tolerance?: number;
  onBeat?: () => void;
  onTimeout?: () => void;
}

/**
 * Unified timer management system
 * Optimizes resource usage by using a single RAF loop with intelligent scheduling
 */
export class TimerManager {
  private static instance: TimerManager | null = null;

  private tasks: Map<string, TimerTask> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private rafId: number | null = null;
  private isRunning = false;
  private lastFrame = 0;

  // Heartbeat monitoring
  private heartbeats: Map<string, HeartbeatOptions & { lastBeat: number }> = new Map();

  // Performance optimization
  private readonly MIN_FRAME_TIME = 16; // ~60fps
  private readonly MAX_TASKS_PER_FRAME = 5; // Limit tasks per frame to avoid blocking

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * Add a recurring task to the timer loop
   * More efficient than setInterval for multiple tasks
   */
  addTask(id: string, callback: () => Promise<void> | void, interval: number): void {
    this.tasks.set(id, {
      id,
      callback,
      interval,
      lastRun: 0,
      enabled: true,
    });

    this.startLoop();
  }

  /**
   * Remove a task from the timer loop
   */
  removeTask(id: string): void {
    this.tasks.delete(id);

    if (this.tasks.size === 0) {
      this.stopLoop();
    }
  }

  /**
   * Enable/disable a task without removing it
   */
  toggleTask(id: string, enabled: boolean): void {
    const task = this.tasks.get(id);
    if (task) {
      task.enabled = enabled;
    }
  }

  /**
   * Set a timeout with automatic cleanup tracking
   */
  setTimeout(id: string, callback: () => void, delay: number): void {
    this.clearTimeout(id); // Clear existing timeout with same id

    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(id);
    }, delay);

    this.timeouts.set(id, timeoutId);
  }

  /**
   * Clear a specific timeout
   */
  clearTimeout(id: string): void {
    const timeoutId = this.timeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(id);
    }
  }

  /**
   * Set an interval with automatic cleanup tracking
   */
  setInterval(id: string, callback: () => void, interval: number): void {
    this.clearInterval(id); // Clear existing interval with same id

    const intervalId = setInterval(callback, interval);
    this.intervals.set(id, intervalId);
  }

  /**
   * Clear a specific interval
   */
  clearInterval(id: string): void {
    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat(id: string, options: HeartbeatOptions): void {
    const heartbeat = {
      ...options,
      tolerance: options.tolerance ?? options.interval * 0.5,
      lastBeat: Date.now(),
    };

    this.heartbeats.set(id, heartbeat);

    // Set up heartbeat interval
    this.setInterval(
      `heartbeat-${id}`,
      () => {
        const now = Date.now();
        const hb = this.heartbeats.get(id);

        if (hb) {
          hb.onBeat?.();
          hb.lastBeat = now;

          // Check for timeout
          if (now - hb.lastBeat > hb.interval + (hb.tolerance ?? 0)) {
            hb.onTimeout?.();
          }
        }
      },
      options.interval,
    );
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat(id: string): void {
    this.heartbeats.delete(id);
    this.clearInterval(`heartbeat-${id}`);
  }

  /**
   * Update heartbeat (call this from your monitoring code)
   */
  updateHeartbeat(id: string): void {
    const heartbeat = this.heartbeats.get(id);
    if (heartbeat) {
      heartbeat.lastBeat = Date.now();
    }
  }

  /**
   * Get task statistics for monitoring
   */
  getStats(): {
    activeTasks: number;
    activeTimeouts: number;
    activeIntervals: number;
    activeHeartbeats: number;
    isRunning: boolean;
  } {
    return {
      activeTasks: this.tasks.size,
      activeTimeouts: this.timeouts.size,
      activeIntervals: this.intervals.size,
      activeHeartbeats: this.heartbeats.size,
      isRunning: this.isRunning,
    };
  }

  /**
   * Cleanup all timers and tasks but keep the instance alive
   * Useful for resetting the timer manager without destroying the singleton
   */
  cleanup(): void {
    this.stopLoop();

    // Clear all timeouts
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();

    // Clear all intervals
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();

    // Clear tasks and heartbeats
    this.tasks.clear();
    this.heartbeats.clear();
  }

  /**
   * Clear all timers and stop the loop, then destroy the instance
   */
  destroy(): void {
    this.cleanup();
    TimerManager.instance = null;
  }

  /**
   * Start the main timer loop using requestAnimationFrame
   */
  private startLoop(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.loop();
  }

  /**
   * Stop the main timer loop
   */
  private stopLoop(): void {
    this.isRunning = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Main timer loop using requestAnimationFrame
   */
  private loop(): void {
    if (!this.isRunning) return;

    const now = performance.now();

    // Throttle to maintain performance
    if (now - this.lastFrame >= this.MIN_FRAME_TIME) {
      this.lastFrame = now;
      this.processTasks();
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  /**
   * Process tasks with performance optimization
   */
  private async processTasks(): Promise<void> {
    const now = Date.now();
    let processedCount = 0;

    for (const [id, task] of this.tasks) {
      // Limit tasks per frame to avoid blocking
      if (processedCount >= this.MAX_TASKS_PER_FRAME) {
        break;
      }

      if (!task.enabled) continue;

      // Check if task should run
      if (now - task.lastRun >= task.interval) {
        try {
          await task.callback();
          task.lastRun = now;
          processedCount++;
        } catch (error) {
          logger.error(`Timer task ${id} failed:`, error);
        }
      }
    }
  }
}

/**
 * Global timer manager instance
 */
export const timerManager = TimerManager.getInstance();
