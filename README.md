# aurelia2-testing-library
A React Testing Library–inspired helper for Aurelia 2 apps, built on top of
`@aurelia/testing` and `@testing-library/dom`.

## Install

```bash
npm i -D aurelia2-testing-library @aurelia/testing @testing-library/dom
```

## Quick start

```ts
import { render, screen, userEvent, createUserEvent, cleanup } from 'aurelia2-testing-library';
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
  await render('<hello-world></hello-world>', {
    component: HelloWorld,
  });

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

### `screen`
`screen` is bound to the most recently rendered fixture’s `baseElement`, just
like React Testing Library. Use it for top-level queries.

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
