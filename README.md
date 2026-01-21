# aurelia2-testing-library
A React Testing Library–inspired helper for Aurelia 2 apps, built on top of
`@aurelia/testing` and `@testing-library/dom`.

## Install

```bash
npm i -D aurelia2-testing-library @aurelia/testing @testing-library/dom
```

## Test environment setup (Node + jsdom)
`@aurelia/testing` needs a platform instance. In a Node test runner, set it
once during setup.

If you created your app with `npx makes aurelia`, the Vitest/Jest setup file it
generates already configures the platform for you. In that case, you can skip
the setup below and just use the library in your tests.

```ts
import { JSDOM } from 'jsdom';
import { BrowserPlatform } from '@aurelia/platform-browser';
import { setPlatform } from '@aurelia/testing';

const jsdom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
  pretendToBeVisual: true,
});

const w = jsdom.window;
const platform = new BrowserPlatform(w, {
  queueMicrotask: typeof w.queueMicrotask === 'function'
    ? w.queueMicrotask.bind(w)
    : (cb) => Promise.resolve().then(cb),
  fetch: typeof w.fetch === 'function'
    ? w.fetch.bind(w)
    : () => { throw new Error('fetch not available'); },
});

setPlatform(platform);
BrowserPlatform.set(globalThis, platform);
```

If your test runner already provides a DOM (for example jsdom in Jest/Vitest),
you can use:

```ts
import { BrowserPlatform } from '@aurelia/platform-browser';
import { setPlatform } from '@aurelia/testing';

const platform = BrowserPlatform.getOrCreate(globalThis);
setPlatform(platform);
BrowserPlatform.set(globalThis, platform);
```

## Quick start

```ts
import { renderComponent, screen, userEvent, createUserEvent, cleanup } from 'aurelia2-testing-library';
import { CustomElement } from '@aurelia/runtime-html';

afterEach(async () => {
  await cleanup();
});

class HelloWorld {
  public name = 'Aurelia';
}

CustomElement.define({
  name: 'hello-world',
  template: `<label>Name</label><input value.bind="name"><p>Hello, \\${name}!</p>`,
})(HelloWorld);

it('renders and updates', async () => {
  await renderComponent(HelloWorld);

  expect(screen.getByText('Hello, Aurelia!')).toBeTruthy();

  await userEvent.type(screen.getByLabelText('Name'), ' Testing');

  expect(screen.getByText('Hello, Testing!')).toBeTruthy();
});
```

## API

### `render(template, options)`
Creates and (by default) starts an Aurelia fixture, returning DOM Testing
Library queries plus helpful Aurelia-specific handles.

```ts
const result = await render('<my-app></my-app>', {
  component: MyApp,
  registrations: [MyService],
  autoStart: true,
  appConfig: { allowActionlessForm: true },
});

result.container;     // <app> element that Aurelia renders into
result.host;          // wrapper <div>
result.component;     // root view-model instance
result.fixture;       // Aurelia testing fixture
await result.unmount();
```

Options:
- `component`: root component class/instance.
- `registrations`: DI registrations for the fixture container.
- `autoStart`: if `false`, create fixture without starting; call `result.start()`.
- `ctx`: custom `TestContext` (advanced use).
- `appConfig`: forwarded to Aurelia app root (limited to fixture config).
- `rootElementDef`: partial root element definition override.
- `attachTo`: element to move the fixture host into (defaults to `document.body`).
- `baseElement`: element used by `screen` and query bindings (defaults to `document.body` or `attachTo`).

Tip: if your root component is already a `CustomElement` (e.g. `MyApp`),
prefer `renderComponent(MyApp)` to avoid recursive `<my-app>` templates.

### `screen`
`screen` is bound to the most recently rendered fixture’s `baseElement`, just
like React Testing Library. Use it for top-level queries.

### `renderComponent(component, options)`
Render a CustomElement as the root without manually passing its template.
This avoids self-referencing templates like `<my-app>` inside the root.

```ts
import { renderComponent } from 'aurelia2-testing-library';
import { MyApp } from '../src/my-app';

await renderComponent(MyApp);
```

### `userEvent`
User-event helpers simulate realistic browser sequences (pointer + mouse +
focus + keyboard + input/change). They are async and support optional delays.
Use `userEvent` for defaults, or `createUserEvent` to customize timing.

```ts
const user = createUserEvent({ delay: 5 });

await user.click(screen.getByRole('button', { name: 'Save' }));
await user.type(screen.getByLabelText('Name'), 'Aurelia');
await user.tab();
await user.paste(screen.getByLabelText('Bio'), 'Hello!');
await user.selectOptions(screen.getByLabelText('Role'), 'Admin');
await user.upload(screen.getByLabelText('Avatar'), new File(['x'], 'avatar.png'));
```

Available helpers:
- `click`, `dblClick`, `tripleClick`, `rightClick`, `hover`, `unhover`
- `focus`, `blur`, `pointer`
- `type`, `keyboard`, `clear`, `paste`
- `selectOptions`, `deselectOptions`, `upload`
- `tab`

Pointer actions allow explicit sequences:

```ts
await user.pointer([
  { target: slider, type: 'down', clientX: 10, clientY: 5 },
  { type: 'move', clientX: 80, clientY: 5 },
  { type: 'up' },
]);
```

### `cleanup()`
Stops and disposes all mounted fixtures and resets `screen`.

### DOM Testing Library exports
This library re-exports common helpers from `@testing-library/dom`:
`fireEvent`, `within`, `waitFor`, `waitForElementToBeRemoved`, `getQueriesForElement`,
`queries`, `prettyDOM`, `logDOM`, and `configure`.

If you need additional helpers or types, import them directly from
`@testing-library/dom`.

## Notes
- This library relies on a DOM environment (jsdom, happy-dom, or a real browser).
- For microtask/queue flushing, `@aurelia/testing` provides `ensureTaskQueuesEmpty()`.
- If your Aurelia bindings update asynchronously, prefer `await waitFor(...)` or
  `ensureTaskQueuesEmpty()` after user interactions.
