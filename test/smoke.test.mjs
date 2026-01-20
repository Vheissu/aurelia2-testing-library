import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { BrowserPlatform } from '@aurelia/platform-browser';
import { ensureTaskQueuesEmpty, setPlatform } from '@aurelia/testing';
import { render, cleanup, screen, userEvent, waitFor } from '../dist/index.js';

const jsdom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
  pretendToBeVisual: true,
});
const p = Promise.resolve();
const $queueMicrotask = (cb) => {
  p.then(cb).catch(err => {
    throw err;
  });
};
const w = Object.assign(jsdom.window);

const platform = new BrowserPlatform(w, {
  queueMicrotask: typeof w.queueMicrotask === 'function' ? w.queueMicrotask.bind(w) : $queueMicrotask,
  fetch: typeof w.fetch === 'function' ? w.fetch.bind(w) : (() => { throw new Error('fetch not available'); }),
});
setPlatform(platform);
BrowserPlatform.set(globalThis, platform);

const globals = [
  'window',
  'document',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLSelectElement',
  'HTMLOptionElement',
  'HTMLButtonElement',
  'HTMLLabelElement',
  'HTMLFormElement',
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
];
for (const key of globals) {
  if (key in w) {
    Object.defineProperty(globalThis, key, {
      value: w[key],
      configurable: true,
      writable: true,
    });
  }
}

class App {
  message = 'Hello';
  checked = false;
  submitCount = 0;

  onSubmit(event) {
    event.preventDefault();
    this.submitCount += 1;
  }
}

const template = `
  <form submit.trigger="onSubmit($event)">
    <label for="name">Name</label>
    <input id="name" value.bind="message">
    <label>
      <input id="agree" type="checkbox" checked.bind="checked">
      Agree
    </label>
    <button type="submit">Save</button>
    <p id="message">\${message}</p>
    <p id="checked">\${checked}</p>
    <p id="submit">\${submitCount}</p>
  </form>
`;

test('aurelia fixture smoke test with userEvent', async () => {
  await render(template, { component: App });

  assert.equal(screen.getByText('Hello').id, 'message');

  await userEvent.type(screen.getByLabelText('Name'), ' World');

  await waitFor(() => {
    assert.equal(screen.getByText('Hello World').id, 'message');
  });

  await userEvent.click(screen.getByLabelText('Agree'));
  ensureTaskQueuesEmpty();

  await waitFor(() => {
    assert.equal(screen.getByText('true').id, 'checked');
  });

  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    assert.equal(screen.getByText('1').id, 'submit');
  });

  await cleanup();
});
