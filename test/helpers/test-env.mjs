import { afterEach } from 'node:test';
import { JSDOM } from 'jsdom';
import { installAureliaTestEnvironment } from '../../dist/index.js';

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

  installAureliaTestEnvironment({
    window: w,
    copyGlobals: true,
    afterEach,
    platformOverrides: {
      queueMicrotask: typeof w.queueMicrotask === 'function' ? w.queueMicrotask.bind(w) : queueMicrotask,
      fetch: typeof w.fetch === 'function' ? w.fetch.bind(w) : (() => { throw new Error('fetch not available'); }),
    },
  });

  afterEach(async () => {
    w.document.body.innerHTML = '';
    w.document.head.innerHTML = '';
  });

  return {
    window: w,
    document: w.document,
  };
};
