import { cleanup } from './render.js';

type AfterEachHook = (callback: () => unknown | Promise<unknown>) => unknown;

let registered = false;
let disabled = false;

const getGlobalAfterEach = (): AfterEachHook | undefined => {
  const candidate = (globalThis as { afterEach?: unknown }).afterEach;
  return typeof candidate === 'function' ? candidate as AfterEachHook : undefined;
};

const isAutoCleanupSkipped = (): boolean => {
  const maybeProcess = (globalThis as {
    process?: { env?: Record<string, string | undefined> };
  }).process;
  return maybeProcess?.env?.AURELIA_TESTING_LIBRARY_SKIP_AUTO_CLEANUP === 'true';
};

export const enableAutoCleanup = (afterEachHook: AfterEachHook = getGlobalAfterEach()!): boolean => {
  if (registered || disabled || afterEachHook == null) {
    return false;
  }
  registered = true;
  afterEachHook(async () => {
    await cleanup();
  });
  return true;
};

export const disableAutoCleanup = (): void => {
  disabled = true;
};

if (!isAutoCleanupSkipped()) {
  enableAutoCleanup();
}
