import { BrowserPlatform } from '@aurelia/platform-browser';
import { setPlatform } from '@aurelia/testing';
import { enableAutoCleanup } from './auto-cleanup.js';

type DomWindow = Window & Partial<typeof globalThis>;

type GlobalWithDom = typeof globalThis & {
  window: DomWindow;
  document: Document;
};

type AfterEachHook = Parameters<typeof enableAutoCleanup>[0];

export interface InstallAureliaTestEnvironmentOptions {
  /**
   * Global object used by the test runner. Defaults to globalThis.
   */
  global?: typeof globalThis;
  /**
   * DOM window to install. Defaults to global.window.
   */
  window?: DomWindow;
  /**
   * BrowserPlatform overrides, for example fetch or queueMicrotask.
   */
  platformOverrides?: ConstructorParameters<typeof BrowserPlatform>[1];
  /**
   * Copy common DOM globals from the provided window onto the test global.
   */
  copyGlobals?: boolean | string[];
  /**
   * Register cleanup with the runner's afterEach hook.
   */
  autoCleanup?: boolean;
  /**
   * Explicit afterEach hook for runners that do not expose a global afterEach.
   */
  afterEach?: AfterEachHook;
}

const defaultGlobals = [
  'window',
  'document',
  'Node',
  'Text',
  'Element',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLSelectElement',
  'HTMLOptionElement',
  'HTMLButtonElement',
  'HTMLLabelElement',
  'HTMLFormElement',
  'HTMLAnchorElement',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'InputEvent',
  'PointerEvent',
  'FocusEvent',
  'File',
  'FileList',
  'DataTransfer',
  'DocumentFragment',
  'CSS',
];

const hasDom = (value: unknown): value is GlobalWithDom => {
  const maybeGlobal = value as Partial<GlobalWithDom> | null;
  return maybeGlobal?.window != null && maybeGlobal.document != null;
};

const copyDomGlobals = (
  target: typeof globalThis,
  source: DomWindow,
  keys: boolean | string[] | undefined
): void => {
  if (keys === false) {
    return;
  }
  const names = Array.isArray(keys) ? keys : defaultGlobals;
  for (const key of names) {
    if (key in source) {
      Object.defineProperty(target, key, {
        value: source[key as keyof typeof source],
        configurable: true,
        writable: true,
      });
    }
  }
};

export const installAureliaTestEnvironment = (
  options: InstallAureliaTestEnvironmentOptions = {}
): BrowserPlatform => {
  const target = options.global ?? globalThis;
  const window = options.window ?? (hasDom(target) ? target.window : undefined);

  if (window == null) {
    throw new Error(
      'installAureliaTestEnvironment requires an existing DOM window. Provide one from jsdom/happy-dom, or run in a jsdom test environment.'
    );
  }

  copyDomGlobals(target, window, options.copyGlobals);

  const platformGlobal = window as unknown as typeof globalThis;
  const platform = new BrowserPlatform(platformGlobal, options.platformOverrides);
  setPlatform(platform);
  BrowserPlatform.set(target, platform);

  if (options.autoCleanup !== false) {
    enableAutoCleanup(options.afterEach);
  }

  return platform;
};
