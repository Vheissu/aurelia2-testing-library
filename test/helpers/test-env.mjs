import { afterEach } from 'node:test';
import { JSDOM } from 'jsdom';
import { BrowserPlatform } from '@aurelia/platform-browser';
import { setPlatform } from '@aurelia/testing';
import { cleanup } from '../../dist/index.js';

const globals = [
  'window',
  'document',
  'Node',
  'Text',
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

export const installTestEnvironment = () => {
  const jsdom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
    pretendToBeVisual: true,
  });
  const p = Promise.resolve();
  const queueMicrotask = cb => {
    p.then(cb).catch(error => {
      throw error;
    });
  };
  const w = jsdom.window;

  const platform = new BrowserPlatform(w, {
    queueMicrotask: typeof w.queueMicrotask === 'function' ? w.queueMicrotask.bind(w) : queueMicrotask,
    fetch: typeof w.fetch === 'function' ? w.fetch.bind(w) : (() => { throw new Error('fetch not available'); }),
  });

  setPlatform(platform);
  BrowserPlatform.set(globalThis, platform);

  for (const key of globals) {
    if (key in w) {
      Object.defineProperty(globalThis, key, {
        value: w[key],
        configurable: true,
        writable: true,
      });
    }
  }

  afterEach(async () => {
    await cleanup();
    w.document.body.innerHTML = '';
    w.document.head.innerHTML = '';
  });

  return {
    window: w,
    document: w.document,
  };
};
