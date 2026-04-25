import { ensureTaskQueuesEmpty } from '@aurelia/testing';

export interface SettleOptions {
  /**
   * Number of microtask/check cycles to run around Aurelia's task queue flush.
   */
  cycles?: number;
}

const nextTick = async (): Promise<void> => {
  await Promise.resolve();
};

/**
 * Flush pending microtasks and Aurelia task queues.
 */
export const settle = async (options: SettleOptions = {}): Promise<void> => {
  const cycles = Math.max(1, options.cycles ?? 2);

  for (let i = 0; i < cycles; i += 1) {
    await nextTick();
    ensureTaskQueuesEmpty();
  }

  await nextTick();
};

/**
 * Run a test action and then flush Aurelia's queued work.
 */
export const act = async <T>(
  callback?: () => T | Promise<T>,
  options?: SettleOptions
): Promise<T | undefined> => {
  const result = callback == null ? undefined : await callback();
  await settle(options);
  return result;
};
