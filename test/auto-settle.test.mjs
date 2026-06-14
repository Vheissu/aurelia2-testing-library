import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomElement } from '@aurelia/runtime-html';
import { setup, setupComponent } from '../dist/index.js';
import { installTestEnvironment } from './helpers/test-env.mjs';

installTestEnvironment();

test('setup user auto-flushes Aurelia bindings without manual waitFor', async () => {
  const { user, getByRole, getByTestId } = await setup(
    `<button click.trigger="count++">Add</button><span data-testid="count">\${count}</span>`,
    { component: class { count = 0; } }
  );

  await user.click(getByRole('button', { name: 'Add' }));
  assert.equal(getByTestId('count').textContent, '1');

  await user.click(getByRole('button', { name: 'Add' }));
  assert.equal(getByTestId('count').textContent, '2');
});

test('setup user reflects typed input into bound state synchronously after await', async () => {
  const { user, getByLabelText, getByTestId } = await setup(
    `<label>Name<input value.bind="name"></label><p data-testid="greeting">Hi \${name}</p>`,
    { component: class { name = ''; } }
  );

  await user.type(getByLabelText('Name'), 'Ada');
  assert.equal(getByTestId('greeting').textContent, 'Hi Ada');
});

test('setupComponent passes a custom settle override through to the user', async () => {
  let settleCalls = 0;
  const El = CustomElement.define(
    { name: 'counter-el', template: `<button click.trigger="n++">+</button>\${n}` },
    class { n = 0; }
  );

  const { user, getByRole } = await setupComponent(El, {
    user: { settle: () => { settleCalls += 1; } },
  });

  await user.click(getByRole('button', { name: '+' }));
  assert.ok(settleCalls > 0, 'custom settle override should be invoked');
});
