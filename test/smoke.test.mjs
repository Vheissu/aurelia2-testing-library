import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTaskQueuesEmpty } from '@aurelia/testing';
import { render, screen, userEvent, waitFor } from '../dist/index.js';
import { installTestEnvironment } from './helpers/test-env.mjs';

installTestEnvironment();

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
});
