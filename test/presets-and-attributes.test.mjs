import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from '@aurelia/kernel';
import { CustomAttribute, INode, ValueConverter } from '@aurelia/runtime-html';
import {
  createRender,
  renderAttribute,
  renderValueConverter,
  screen,
  waitFor,
} from '../dist/index.js';
import { installTestEnvironment } from './helpers/test-env.mjs';

installTestEnvironment();

const getByDataState = (container, state) => {
  const element = container.querySelector(`[data-state="${state}"]`);
  if (element == null) {
    throw new Error(`Unable to find element with data-state="${state}"`);
  }
  return element;
};

test('createRender merges reusable defaults, per-test props, wrappers, and custom queries', async () => {
  class PresetApp {
    prefix = '';
    name = '';
    state = '';
  }

  const appRender = createRender({
    wrapper: '<main aria-label="Harness"><slot></slot></main>',
    props: { prefix: 'Hello' },
    queries: { getByDataState },
  });

  const result = await appRender(
    `<p data-state.bind="state">\${prefix}, \${name}</p>`,
    {
      component: PresetApp,
      props: { name: 'Aurelia', state: 'ready' },
    }
  );

  assert.equal(result.getByDataState('ready').textContent, 'Hello, Aurelia');
  assert.equal(screen.getByDataState('ready'), result.getByDataState('ready'));
  assert.equal(screen.getByLabelText('Harness').tagName, 'MAIN');

  await result.rerender({ state: 'done', name: 'Testing Library' });

  assert.equal(screen.getByDataState('done').textContent, 'Hello, Testing Library');
});

test('createRender preset setup returns user with the same reusable render defaults', async () => {
  class PresetForm {
    value = 'Au';
  }

  const appRender = createRender({
    wrapper: '<section aria-label="Shell">{{children}}</section>',
  });

  const result = await appRender.setup(
    `<label>Name<input value.bind="value"></label><p>\${value}</p>`,
    { component: PresetForm }
  );

  await result.user.type(screen.getByLabelText('Name'), 'relia');

  await waitFor(() => {
    assert.equal(screen.getByText('Aurelia').closest('section')?.getAttribute('aria-label'), 'Shell');
  });
});

test('renderAttribute renders custom attributes and returns the attribute controller', async () => {
  class AttributeRoot {
    color = 'red';
  }

  class HighlightAttribute {
    host = resolve(INode);
    value = '';

    binding() {
      this.apply();
    }

    valueChanged() {
      this.apply();
    }

    apply() {
      this.host.setAttribute('data-highlight', this.value);
    }
  }

  const Highlight = CustomAttribute.define({
    name: 'highlight',
    bindables: ['value'],
    defaultProperty: 'value',
  }, HighlightAttribute);

  const result = await renderAttribute(Highlight, {
    component: AttributeRoot,
    attributeBinding: 'color',
    host: 'button',
    hostAttrs: {
      type: 'button',
      'aria-label': 'Color swatch',
      hidden: false,
      'data-flag': true,
    },
    content: 'Marked',
  });

  assert.equal(result.target.tagName, 'BUTTON');
  assert.equal(result.target.textContent, 'Marked');
  assert.equal(result.target.getAttribute('data-flag'), '');
  assert.equal(result.attribute.value, 'red');
  assert.equal(result.attributeController.viewModel, result.attribute);
  assert.equal(result.target.getAttribute('data-highlight'), 'red');

  await result.rerender({ color: 'blue' });

  await waitFor(() => {
    assert.equal(result.target.getAttribute('data-highlight'), 'blue');
  });
});

test('renderAttribute supports raw attribute values without a root component', async () => {
  class ToneAttribute {
    host = resolve(INode);
    value = '';

    binding() {
      this.host.setAttribute('data-tone', this.value);
    }
  }

  const Tone = CustomAttribute.define({
    name: 'tone',
    bindables: ['value'],
    defaultProperty: 'value',
  }, ToneAttribute);

  const result = await renderAttribute(Tone, {
    attributeValue: 'warm',
    content: 'Notice',
  });

  assert.equal(result.target.getAttribute('data-tone'), 'warm');
  assert.equal(result.attribute.value, 'warm');
});

test('renderValueConverter renders undecorated value converter classes with a test name', async () => {
  class ShoutValueConverter {
    calls = [];

    toView(value, suffix = '') {
      this.calls.push(value);
      return `${String(value).toUpperCase()}${suffix}`;
    }
  }

  const result = await renderValueConverter(ShoutValueConverter, {
    name: 'shout',
    value: 'aurelia',
    args: "'!'",
    host: 'strong',
    hostAttrs: {
      'aria-label': 'Converted value',
      'data-kind': 'shout',
    },
  });

  assert.equal(result.target.tagName, 'STRONG');
  assert.equal(result.target.getAttribute('aria-label'), 'Converted value');
  assert.equal(result.target.textContent, 'AURELIA!');
  assert.deepEqual(result.converter.calls, ['aurelia']);

  await result.rerender({ value: 'rc1' });

  await waitFor(() => {
    assert.equal(result.target.textContent, 'RC1!');
  });
});

test('createRender preset valueConverter uses reusable defaults and defined converter resources', async () => {
  class Root {
    prefix = '';
  }

  class PrefixValueConverter {
    toView(value, prefix) {
      return `${prefix}${value}`;
    }
  }

  const appRender = createRender({
    component: Root,
    props: { prefix: 'Read ' },
    wrapper: '<section aria-label="Resource shell"><slot></slot></section>',
  });

  const PrefixConverter = ValueConverter.define('prefix', PrefixValueConverter);
  const result = await appRender.valueConverter(PrefixConverter, {
    value: 'the docs',
    args: 'prefix',
  });

  assert.equal(result.target.textContent, 'Read the docs');
  assert.equal(screen.getByLabelText('Resource shell').tagName, 'SECTION');
  assert.equal(result.converter.toView('Aurelia', 'Hello '), 'Hello Aurelia');
});
