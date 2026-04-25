# aurelia2-testing-library

A React Testing Library-inspired helper for Aurelia 2 apps, built on top of
`@aurelia/testing` and `@testing-library/dom`.

The goal is simple: render Aurelia components with almost no boilerplate, query
the page the way a user would, interact through realistic async user events, and
only reach for Aurelia internals when a test truly needs them.

## Install

```bash
npm i -D aurelia2-testing-library @aurelia/testing@rc @aurelia/platform-browser@rc @aurelia/kernel@rc @aurelia/runtime-html@rc @testing-library/dom
```

## Test Setup

If your runner already provides a DOM, such as Vitest or Jest with jsdom, set up
the Aurelia platform once in your test setup file:

```ts
import { afterEach } from 'vitest';
import { installAureliaTestEnvironment } from 'aurelia2-testing-library';

installAureliaTestEnvironment({ afterEach });
```

For Node's built-in test runner with a manual jsdom window:

```ts
import { afterEach } from 'node:test';
import { JSDOM } from 'jsdom';
import { installAureliaTestEnvironment } from 'aurelia2-testing-library';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
});

installAureliaTestEnvironment({
  window: dom.window,
  copyGlobals: true,
  afterEach,
});
```

Cleanup is registered automatically when a global `afterEach` exists. You can
also call `enableAutoCleanup(afterEach)`, `disableAutoCleanup()`, or `cleanup()`
manually.

## Quick Start

```ts
import { CustomElement } from '@aurelia/runtime-html';
import { setupComponent, screen, waitFor } from 'aurelia2-testing-library';

class HelloWorld {
  name = 'Aurelia';
}

const HelloWorldElement = CustomElement.define({
  name: 'hello-world',
  template: `
    <label>Name<input value.bind="name"></label>
    <p>Hello, \${name}!</p>
  `,
}, HelloWorld);

it('renders and updates', async () => {
  const { user } = await setupComponent(HelloWorldElement);

  await user.type(screen.getByLabelText('Name'), ' Testing');

  await waitFor(() => {
    expect(screen.getByText('Hello, Aurelia Testing!')).toBeTruthy();
  });
});
```

## Everyday API

### `setup(template, options)`

Creates a `userEvent` instance before rendering, then returns it with the render
result.

```ts
const { user, component } = await setup(
  `<button click.trigger="save()">Save</button>`,
  { component: SaveForm }
);

await user.click(screen.getByRole('button', { name: 'Save' }));
```

### `setupComponent(component, options)`

Render a `CustomElement` as the root without passing its template yourself.

```ts
const { user, component } = await setupComponent(ProfileEditor, {
  props: { name: 'Dwayne' },
});
```

### `createRender(defaults)`

Create a reusable render preset for app-wide providers, wrappers, fixtures, and
custom queries.

```ts
const appRender = createRender({
  wrapper: '<main aria-label="Test harness"><slot></slot></main>',
  registrations: [MockApi],
  queries: {
    getByDataState(container, state) {
      const el = container.querySelector(`[data-state="${state}"]`);
      if (!el) throw new Error(`No data-state="${state}" element`);
      return el;
    },
  },
});

const { user } = await appRender.setup('<profile-form></profile-form>', {
  component: ProfileForm,
});

screen.getByDataState('ready');
```

The returned preset is callable and also exposes `.setup()`, `.component()`,
`.setupComponent()`, `.attribute()`, and `.valueConverter()`.

### Extensions

Use `defineExtension()` to add project-specific test helpers without forking the
library or repeating setup code in every test.

```ts
import { createRender, defineExtension } from 'aurelia2-testing-library';

const withAuthTools = defineExtension({
  name: 'auth-tools',
  beforeRender({ options }) {
    options.props = {
      ...(options.props ?? {}),
      currentUser: { name: 'Test User' },
    };
    options.wrapper = '<main aria-label="App shell"><slot></slot></main>';
  },
  extend(result) {
    return {
      getAppShell: () => result.getByLabelText('App shell'),
      expectSignedIn: () => result.getByText('Test User'),
    };
  },
  cleanup(result) {
    result.container.dispatchEvent(new CustomEvent('test:cleanup'));
  },
});

const appRender = createRender({
  registrations: [MockApi],
  extensions: [withAuthTools],
});

const result = await appRender('<profile-menu></profile-menu>', {
  component: ProfileMenu,
});

result.expectSignedIn();
result.getAppShell();
```

Extension hooks:
- `beforeRender(context)`: adjust render options before the fixture is created,
  or return a replacement template.
- `extend(result, context)`: return helper methods/properties to merge onto the
  render result.
- `cleanup(result, context)`: release extension resources during `unmount()` or
  global `cleanup()`.

Extension helpers cannot overwrite built-in result properties such as `unmount`,
`rerender`, or Testing Library queries. Add extensions directly to a single
`render()` call or to a reusable `createRender()` preset.

### `render(template, options)`

Creates and starts an Aurelia fixture, returning DOM Testing Library queries plus
Aurelia-specific handles.

```ts
const result = await render('<my-app></my-app>', {
  component: MyApp,
  registrations: [MyService],
  props: { mode: 'edit' },
  wrapper: '<section aria-label="Test shell"><slot></slot></section>',
  appConfig: { allowActionlessForm: true },
});

result.component;     // root view-model instance
result.fixture;       // @aurelia/testing fixture
result.container;     // <app> element that Aurelia renders into
result.host;          // wrapper div created by @aurelia/testing
result.baseElement;   // query/screen base

await result.rerender({ mode: 'read' });
await result.unmount();
```

Options:
- `component`: root component class/instance.
- `props`: initial values assigned to the root component.
- `wrapper`: string or function wrapper. String wrappers use `<slot></slot>`,
  `<slot />`, or `{{children}}`.
- `registrations`: DI registrations for the fixture container.
- `autoStart`: if `false`, create the fixture without starting; call
  `result.start()`.
- `ctx`: custom `TestContext`.
- `appConfig`: forwarded to Aurelia app root.
- `rootElementDef`: partial root element definition override.
- `attachTo`: element to move the fixture host into.
- `baseElement`: element used by `screen` and bound queries.
- `queries`: app-specific DOM Testing Library queries merged with the defaults.
- `extensions`: project-specific render extensions created with
  `defineExtension()`.

### `renderAttribute(attribute, options)`

Render and inspect a custom attribute without hand-writing the host fixture.

```ts
const result = await renderAttribute(HighlightAttribute, {
  attributeBinding: 'color',
  component: class {
    color = 'red';
  },
  host: 'button',
  hostAttrs: { type: 'button', 'aria-label': 'Swatch' },
  content: 'Marked',
});

result.target;              // host element
result.attribute;           // custom attribute view-model
result.attributeController; // Aurelia custom attribute controller
```

Use `attributeBinding` for `.bind` expressions and `attributeValue` for raw
attribute values.

### `renderValueConverter(converter, options)`

Render a value converter through Aurelia binding so you can assert the DOM and
still inspect the converter instance.

```ts
class CurrencyValueConverter {
  toView(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  }
}

const result = await renderValueConverter(CurrencyValueConverter, {
  name: 'currency',
  value: 12,
  args: "'AUD'",
  host: 'output',
  hostAttrs: { 'aria-label': 'Price' },
});

result.target;    // rendered host element
result.converter; // value converter instance
```

Pass a `ValueConverter.define(...)` resource directly, or pass an undecorated
class with `name`. Use `expression` when the converter input should come from a
custom root property instead of the default `value`, and use `args` for raw
Aurelia argument expressions.

### `screen`

`screen` is bound to the most recently rendered fixture's `baseElement`, then
falls back to `document.body` when nothing is mounted. It includes DOM Testing
Library queries plus `screen.debug()` and `screen.logTestingPlaygroundURL()`.

### `userEvent`

Use `setup()` / `setupComponent()` for most tests. For standalone DOM tests, use
the default instance or create one explicitly:

```ts
const user = userEvent.setup({ delay: 5 });

await user.click(screen.getByRole('button', { name: 'Save' }));
await user.check(screen.getByLabelText('Subscribe'));
await user.uncheck(screen.getByLabelText('Subscribe'));
await user.type(screen.getByLabelText('Name'), 'Aurelia');
await user.selectAll(screen.getByLabelText('Name'));
await user.tab();
await user.paste(screen.getByLabelText('Bio'), 'Hello!');
await user.selectOptions(screen.getByLabelText('Role'), 'Admin');
await user.upload(screen.getByLabelText('Avatar'), new File(['x'], 'avatar.png'));
```

Available helpers:
- `click`, `check`, `uncheck`, `dblClick`, `tripleClick`, `rightClick`
- `hover`, `unhover`, `focus`, `blur`, `tab`, `pointer`
- `selectAll`, `type`, `keyboard`, `clear`, `paste`
- `selectOptions`, `deselectOptions`, `upload`

## Aurelia Helpers

### `settle()` and `act()`

Flush Aurelia task queues and surrounding microtasks.

```ts
await act(() => {
  result.component.count += 1;
});

await result.settle();
```

### `spyOnEvent(target, type)`

Record DOM events without wiring throwaway arrays in every test.

```ts
const submitted = spyOnEvent(form, 'submit');
const nextSubmit = submitted.next();

await user.click(screen.getByRole('button', { name: 'Save' }));

expect(await nextSubmit).toBe(submitted.lastEvent);
expect(submitted.count).toBe(1);

submitted.dispose();
```

## Re-exports

From DOM Testing Library:
`fireEvent`, `within`, `waitFor`, `waitForElementToBeRemoved`,
`getQueriesForElement`, `queries`, `prettyDOM`, `logDOM`, and `configure`.

From `@aurelia/testing`:
`createFixture`, `ensureTaskQueuesEmpty`, `setPlatform`, `TestContext`, and the
`IFixture` type.

## Notes

- Prefer `screen` queries and `userEvent` over direct DOM selectors and manual
  events.
- Prefer `setupComponent()` for custom elements, and `render()` for inline test
  templates or shell/wrapper scenarios.
- Use `waitFor`, `findBy*`, `settle`, or `act` after interactions that trigger
  asynchronous Aurelia binding or task-queue work.
