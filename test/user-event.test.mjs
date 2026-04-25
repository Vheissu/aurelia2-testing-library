import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createUserEvent, userEvent, within } from '../dist/index.js';
import { installTestEnvironment } from './helpers/test-env.mjs';

const { document } = installTestEnvironment();

test('hover and unhover dispatch mouse transitions', async () => {
  document.body.innerHTML = `<button type="button">Hover me</button>`;
  const button = within(document.body).getByRole('button', { name: 'Hover me' });
  const events = [];

  button.addEventListener('mouseover', () => {
    events.push('mouseover');
  });
  button.addEventListener('mouseout', () => {
    events.push('mouseout');
  });

  await userEvent.hover(button);
  await userEvent.unhover(button);

  assert.deepEqual(events, ['mouseover', 'mouseout']);
});

test('dblClick, tripleClick, and rightClick dispatch the expected events', async () => {
  document.body.innerHTML = `<button type="button">Press me</button>`;
  const button = within(document.body).getByRole('button', { name: 'Press me' });
  let clickCount = 0;
  let dblClickCount = 0;
  let contextMenuCount = 0;

  button.addEventListener('click', () => {
    clickCount += 1;
  });
  button.addEventListener('dblclick', () => {
    dblClickCount += 1;
  });
  button.addEventListener('contextmenu', () => {
    contextMenuCount += 1;
  });

  await userEvent.dblClick(button);
  await userEvent.tripleClick(button);
  await userEvent.rightClick(button);

  assert.equal(clickCount, 5);
  assert.equal(dblClickCount, 2);
  assert.equal(contextMenuCount, 1);
});

test('click respects preventDefault and disabled label targets', async () => {
  document.body.innerHTML = `
    <label for="agree">Agree</label>
    <input id="agree" type="checkbox">
    <label for="disabled">Disabled</label>
    <input id="disabled" type="checkbox" disabled>
  `;

  const checkbox = document.getElementById('agree');
  const disabledCheckbox = document.getElementById('disabled');
  const [agreeLabel, disabledLabel] = document.querySelectorAll('label');

  checkbox.addEventListener('click', event => {
    event.preventDefault();
  });

  await userEvent.click(agreeLabel);
  await userEvent.click(disabledLabel);

  assert.equal(checkbox.checked, false);
  assert.equal(disabledCheckbox.checked, false);
});

test('setup, check, and uncheck mirror common user-event ergonomics', async () => {
  document.body.innerHTML = `
    <label>
      Subscribe
      <input type="checkbox">
    </label>
  `;

  const user = userEvent.setup();
  const checkbox = within(document.body).getByLabelText('Subscribe');
  const changes = [];

  checkbox.addEventListener('change', () => {
    changes.push(checkbox.checked);
  });

  await user.check(checkbox);
  await user.check(checkbox);
  await user.uncheck(checkbox);
  await user.uncheck(checkbox);

  assert.equal(checkbox.checked, false);
  assert.deepEqual(changes, [true, false]);
});

test('type, keyboard, paste, clear, focus, blur, and tab work across common controls', async () => {
  document.body.innerHTML = `
    <label>
      Name
      <input value="A">
    </label>
    <input aria-label="Disabled field" disabled>
    <textarea aria-label="Notes"></textarea>
  `;

  const name = within(document.body).getByLabelText('Name');
  const notes = within(document.body).getByLabelText('Notes');

  name.addEventListener('keydown', event => {
    if (event.key === 'B') {
      event.preventDefault();
    }
  });
  notes.addEventListener('paste', event => {
    event.preventDefault();
  });

  await userEvent.type(name, 'BC');
  assert.equal(name.value, 'AC');

  await userEvent.focus(name);
  assert.equal(document.activeElement, name);

  await userEvent.keyboard('{backspace}');
  assert.equal(name.value, 'A');

  await userEvent.tab();
  assert.equal(document.activeElement, notes);

  await userEvent.paste(notes, 'blocked');
  assert.equal(notes.value, '');

  await userEvent.blur(notes);
  assert.notEqual(document.activeElement, notes);

  await userEvent.clear(name);
  assert.equal(name.value, '');
});

test('type, paste, backspace, delete, and selectAll respect text selections', async () => {
  document.body.innerHTML = `
    <label>
      Title
      <input value="Aurelia Testing">
    </label>
    <label>
      Body
      <textarea>Hello framework</textarea>
    </label>
  `;

  const title = within(document.body).getByLabelText('Title');
  const body = within(document.body).getByLabelText('Body');

  title.setSelectionRange(8, 15);
  await userEvent.focus(title);
  await userEvent.type(title, 'Library');
  assert.equal(title.value, 'Aurelia Library');
  assert.equal(title.selectionStart, 'Aurelia Library'.length);

  title.setSelectionRange(8, 15);
  await userEvent.paste(title, 'Testing');
  assert.equal(title.value, 'Aurelia Testing');

  title.setSelectionRange(8, 15);
  await userEvent.keyboard('{backspace}');
  assert.equal(title.value, 'Aurelia ');
  assert.equal(title.selectionStart, 8);

  title.value = 'Aurelia Testing';
  title.setSelectionRange(8, 8);
  await userEvent.keyboard('{delete}');
  assert.equal(title.value, 'Aurelia esting');

  await userEvent.selectAll(body);
  await userEvent.type(body, 'Hello library');
  assert.equal(body.value, 'Hello library');
});

test('selectOptions, deselectOptions, pointer, and upload enforce browser-like constraints', async () => {
  document.body.innerHTML = `
    <label>
      Roles
      <select multiple>
        <option value="admin">Admin</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
    </label>
    <label>
      Single upload
      <input type="file">
    </label>
    <label>
      Multi upload
      <input type="file" multiple>
    </label>
    <div id="pad" tabindex="0"></div>
  `;

  const roles = within(document.body).getByLabelText('Roles');
  const singleUpload = within(document.body).getByLabelText('Single upload');
  const multiUpload = within(document.body).getByLabelText('Multi upload');
  const pad = document.getElementById('pad');
  const files = [
    new File(['a'], 'a.txt', { type: 'text/plain' }),
    new File(['b'], 'b.txt', { type: 'text/plain' }),
  ];
  const pointerMoves = [];

  pad.addEventListener('mousemove', event => {
    pointerMoves.push([event.clientX, event.clientY]);
  });

  await userEvent.selectOptions(roles, ['admin', 'editor']);
  assert.deepEqual(Array.from(roles.selectedOptions).map(option => option.value), ['admin', 'editor']);

  await userEvent.deselectOptions(roles, 'editor');
  assert.deepEqual(Array.from(roles.selectedOptions).map(option => option.value), ['admin']);

  await userEvent.pointer({ target: pad, type: 'move', clientX: 10, clientY: 20 });
  assert.deepEqual(pointerMoves, [[10, 20]]);

  await userEvent.upload(singleUpload, files);
  await userEvent.upload(multiUpload, files);

  assert.equal(singleUpload.files.length, 1);
  assert.equal(singleUpload.files[0].name, 'a.txt');
  assert.equal(multiUpload.files.length, 2);
});

test('createUserEvent supports contenteditable elements from another document', async () => {
  const foreignDom = new JSDOM(
    `<!DOCTYPE html><html><body><div contenteditable="true"></div></body></html>`,
    { pretendToBeVisual: true }
  );
  const foreignDocument = foreignDom.window.document;
  const editable = foreignDocument.querySelector('div');
  const foreignUser = createUserEvent({ document: foreignDocument });

  await foreignUser.type(editable, 'Hello');

  assert.equal(editable.textContent, 'Hello');
});
