import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanup,
  createRender,
  defineExtension,
  render,
  screen,
} from '../dist/index.js';
import { installTestEnvironment } from './helpers/test-env.mjs';

installTestEnvironment();

test('render extensions can prepare options, replace the template, add helpers, and clean up', async () => {
  const lifecycle = [];

  class StatusApp {
    status = 'idle';
  }

  const withStatusTools = defineExtension({
    name: 'status-tools',
    beforeRender({ options }) {
      options.props = {
        ...(options.props ?? {}),
        status: 'ready',
      };
      options.wrapper = '<section aria-label="Extension shell"><slot></slot></section>';
      return `<p>Status: \${status}</p>`;
    },
    extend(result) {
      return {
        getStatusText: () => result.getByText(`Status: ${result.component.status}`),
      };
    },
    cleanup(result) {
      lifecycle.push(`cleanup:${result.component.status}`);
    },
  });

  const result = await render('<p>Original template</p>', {
    component: StatusApp,
    extensions: [withStatusTools],
  });

  assert.equal(result.getStatusText().textContent, 'Status: ready');
  assert.equal(result.getByLabelText('Extension shell').tagName, 'SECTION');
  assert.throws(() => result.getByText('Original template'));

  await result.unmount();

  assert.deepEqual(lifecycle, ['cleanup:ready']);
});

test('cleanup runs extension cleanup hooks for still-mounted renders', async () => {
  const cleaned = [];

  const withCleanup = defineExtension({
    name: 'cleanup-recorder',
    cleanup(result) {
      cleaned.push(result.container.textContent.trim());
    },
  });

  const result = await render('<p>Global cleanup</p>', {
    extensions: [withCleanup],
  });

  await cleanup();

  assert.deepEqual(cleaned, ['Global cleanup']);
  assert.equal(result.host.isConnected, false);
  assert.throws(() => screen.getByText('Global cleanup'));
});

test('extension cleanup hooks run in reverse registration order', async () => {
  const calls = [];

  const first = defineExtension({
    name: 'first',
    cleanup() {
      calls.push('first');
    },
  });
  const second = defineExtension({
    name: 'second',
    cleanup() {
      calls.push('second');
    },
  });

  const result = await render('<p>Cleanup order</p>', {
    extensions: [first, second],
  });

  await result.unmount();

  assert.deepEqual(calls, ['second', 'first']);
});

test('render rejects extension helpers that would overwrite built-in result properties', async () => {
  const withConflict = defineExtension({
    name: 'conflict',
    extend() {
      return {
        unmount: () => undefined,
      };
    },
  });

  await assert.rejects(
    () => render('<p>Conflicting helper</p>', { extensions: [withConflict] }),
    /Render extension "conflict" tried to overwrite existing result property "unmount"/
  );

  assert.throws(() => screen.getByText('Conflicting helper'));
});

test('createRender carries default and per-render extension APIs together', async () => {
  const withShell = defineExtension({
    name: 'shell-tools',
    beforeRender({ options }) {
      options.wrapper = '<main aria-label="Preset shell"><slot></slot></main>';
    },
    extend(result) {
      return {
        getShell: () => result.getByLabelText('Preset shell'),
      };
    },
  });
  const withHeadline = defineExtension({
    name: 'headline-tools',
    extend(result) {
      return {
        getHeadline: () => result.getByRole('heading', { name: 'Extensible preset' }),
      };
    },
  });

  const appRender = createRender({
    extensions: [withShell],
  });

  const result = await appRender('<h1>Extensible preset</h1>', {
    extensions: [withHeadline],
  });

  assert.equal(result.getShell().tagName, 'MAIN');
  assert.equal(result.getHeadline().textContent, 'Extensible preset');
});
