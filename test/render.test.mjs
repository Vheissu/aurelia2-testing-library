import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomElement } from '@aurelia/runtime-html';
import { cleanup, render, renderComponent, screen } from '../dist/index.js';
import { installTestEnvironment } from './helpers/test-env.mjs';

const { document } = installTestEnvironment();

class GreetingApp {
  message = 'Hello from Aurelia';
}

const GreetingComponent = CustomElement.define({
  name: 'test-render-greeting',
  template: `<p>${'${message}'}</p>`,
}, GreetingApp);

test('renderComponent renders a CustomElement and returns Aurelia handles', async () => {
  const result = await renderComponent(GreetingComponent);

  assert.equal(result.component.message, 'Hello from Aurelia');
  assert.equal(result.getByText('Hello from Aurelia').tagName, 'P');
  assert.equal(screen.getByText('Hello from Aurelia'), result.getByText('Hello from Aurelia'));
  assert.equal(result.host.contains(result.container), true);
  assert.equal(result.asFragment().firstChild?.textContent, 'Hello from Aurelia');
});

test('render with autoStart=false defers DOM updates until start is called', async () => {
  class DeferredApp {
    message = 'Started later';
  }

  const result = await render(`<p>${'${message}'}</p>`, {
    component: DeferredApp,
    autoStart: false,
  });

  assert.equal(result.container.textContent?.trim(), '');

  await result.start();

  assert.equal(result.getByText('Started later').textContent, 'Started later');
});

test('screen restores the previous baseElement when the latest render unmounts', async () => {
  const firstBase = document.createElement('section');
  const secondBase = document.createElement('section');

  const first = await render('<p>First render</p>', {
    attachTo: firstBase,
    baseElement: firstBase,
  });
  const second = await render('<p>Second render</p>', {
    attachTo: secondBase,
    baseElement: secondBase,
  });

  assert.equal(screen.getByText('Second render').textContent, 'Second render');

  await second.unmount();

  assert.equal(screen.getByText('First render').textContent, 'First render');
  assert.throws(() => screen.getByText('Second render'));

  await first.unmount();

  assert.throws(() => screen.getByText('First render'));
});

test('cleanup can retry fixtures after an earlier unmount failure', async () => {
  const result = await render('<p>Retry teardown</p>');
  const originalStop = result.fixture.stop.bind(result.fixture);
  let attempts = 0;

  result.fixture.stop = async (...args) => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error('stop failed once');
    }
    return originalStop(...args);
  };

  await assert.rejects(async () => {
    await result.unmount();
  }, /stop failed once/);

  assert.equal(result.host.isConnected, true);

  await cleanup();

  assert.equal(attempts, 2);
  assert.equal(result.host.isConnected, false);
});
