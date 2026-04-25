import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  render,
  screen,
  setup,
  setupComponent,
  spyOnEvent,
  userEvent,
  waitFor,
} from '../dist/index.js';
import { CustomElement } from '@aurelia/runtime-html';
import { installTestEnvironment } from './helpers/test-env.mjs';

installTestEnvironment();

test('render supports props, wrappers, rerender, and Aurelia settling', async () => {
  class CounterApp {
    label = 'Count';
    count = 0;
  }

  const result = await render(
    `<button type="button" click.trigger="count = count + 1">\${label}: \${count}</button>`,
    {
      component: CounterApp,
      props: { label: 'Total', count: 2 },
      wrapper: '<section aria-label="Harness"><slot></slot></section>',
    }
  );

  assert.equal(screen.getByRole('button', { name: 'Total: 2' }).closest('section')?.getAttribute('aria-label'), 'Harness');

  await result.rerender({ label: 'Score', count: 5 });
  assert.equal(screen.getByRole('button', { name: 'Score: 5' }).tagName, 'BUTTON');

  await act(() => {
    result.component.count = 6;
  });

  await waitFor(() => {
    assert.equal(screen.getByRole('button', { name: 'Score: 6' }).tagName, 'BUTTON');
  });
});

test('setup creates a user instance before rendering', async () => {
  class FormApp {
    name = 'Au';
  }

  const result = await setup(
    `<label>Name<input value.bind="name"></label><p>\${name}</p>`,
    { component: FormApp, user: { delay: 0 } }
  );

  await result.user.type(screen.getByLabelText('Name'), 'relia');

  await waitFor(() => {
    assert.equal(screen.getByText('Aurelia').tagName, 'P');
  });
});

test('setupComponent renders custom elements with user-event conveniences', async () => {
  class ToggleApp {
    enabled = false;
  }

  const ToggleComponent = CustomElement.define({
    name: 'test-convenience-toggle',
    template: `<label><input type="checkbox" checked.bind="enabled"> Enabled</label><p>\${enabled}</p>`,
  }, ToggleApp);

  const result = await setupComponent(ToggleComponent);

  await result.user.check(screen.getByLabelText('Enabled'));
  await waitFor(() => {
    assert.equal(screen.getByText('true').tagName, 'P');
  });

  await result.user.uncheck(screen.getByLabelText('Enabled'));
  await waitFor(() => {
    assert.equal(screen.getByText('false').tagName, 'P');
  });
});

test('spyOnEvent records DOM events and supports awaiting the next event', async () => {
  document.body.innerHTML = `<button type="button">Dispatch</button>`;
  const button = screen.getByRole('button', { name: 'Dispatch' });
  const clickSpy = spyOnEvent(button, 'click');
  const nextClick = clickSpy.next();

  await userEvent.click(button);

  assert.equal(await nextClick, clickSpy.lastEvent);
  assert.equal(clickSpy.count, 1);

  clickSpy.dispose();
  await userEvent.click(button);

  assert.equal(clickSpy.count, 1);
});
