import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserEvent, userEvent, within } from '../dist/index.js';
import { installTestEnvironment } from './helpers/test-env.mjs';

const { document } = installTestEnvironment();

test('click reports detail and held modifier flags', async () => {
  document.body.innerHTML = `<button type="button">Tap</button>`;
  const button = within(document.body).getByRole('button', { name: 'Tap' });
  const clicks = [];
  const dblClicks = [];
  button.addEventListener('click', event => {
    clicks.push({ detail: event.detail, shift: event.shiftKey });
  });
  button.addEventListener('dblclick', event => {
    dblClicks.push(event.detail);
  });

  await userEvent.click(button);
  assert.deepEqual(clicks[0], { detail: 1, shift: false });

  await userEvent.dblClick(button);
  assert.equal(dblClicks[0], 2);
});

test('keyboard modifiers uppercase letters and emit modifier flags', async () => {
  document.body.innerHTML = `<input aria-label="Title">`;
  const input = within(document.body).getByLabelText('Title');
  const downKeys = [];
  input.addEventListener('keydown', event => {
    downKeys.push({ key: event.key, shift: event.shiftKey });
  });

  await userEvent.type(input, '{Shift>}abc{/Shift}d');

  assert.equal(input.value, 'ABCd');
  // The capital letters carry shiftKey, the trailing 'd' does not.
  const letterDowns = downKeys.filter(d => /^[A-Za-z]$/.test(d.key));
  assert.deepEqual(
    letterDowns.map(d => `${d.key}:${d.shift}`),
    ['A:true', 'B:true', 'C:true', 'd:false']
  );
});

test('ctrl/meta chords do not insert text but still fire key events', async () => {
  document.body.innerHTML = `<input aria-label="Search" value="hi">`;
  const input = within(document.body).getByLabelText('Search');
  const seen = [];
  input.addEventListener('keydown', event => {
    if (event.ctrlKey) {
      seen.push(event.key);
    }
  });

  await userEvent.type(input, '{Control>}a{/Control}');

  assert.equal(input.value, 'hi');
  assert.ok(seen.includes('a'), 'ctrl+a keydown should still fire');
});

test('copy and cut read the current selection and emit clipboard events', async () => {
  document.body.innerHTML = `<input aria-label="Note" value="Aurelia Testing">`;
  const input = within(document.body).getByLabelText('Note');
  const events = [];
  input.addEventListener('copy', () => events.push('copy'));
  input.addEventListener('cut', () => events.push('cut'));

  input.setSelectionRange(0, 7);
  const copied = await userEvent.copy(input);
  assert.equal(copied, 'Aurelia');
  assert.equal(input.value, 'Aurelia Testing');

  input.setSelectionRange(8, 15);
  const cut = await userEvent.cut(input);
  assert.equal(cut, 'Testing');
  assert.equal(input.value, 'Aurelia ');
  assert.deepEqual(events, ['copy', 'cut']);
});

test('a user with a settle hook flushes after every interaction', async () => {
  document.body.innerHTML = `<button type="button">Go</button><input aria-label="Field">`;
  const button = within(document.body).getByRole('button', { name: 'Go' });
  const field = within(document.body).getByLabelText('Field');
  const order = [];
  button.addEventListener('click', () => order.push('click'));

  const user = createUserEvent({
    settle: () => {
      order.push('settle');
    },
  });

  await user.click(button);
  await user.type(field, 'x');

  assert.deepEqual(order, ['click', 'settle', 'settle']);
  assert.equal(field.value, 'x');
});
