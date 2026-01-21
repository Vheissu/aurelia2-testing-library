import type { Constructable } from '@aurelia/kernel';
import type { PartialCustomElementDefinition, IAppRootConfig, ICustomElementViewModel } from '@aurelia/runtime-html';
import { CustomElement } from '@aurelia/runtime-html';
import { createFixture, type IFixture, TestContext } from '@aurelia/testing';
import {
  getQueriesForElement,
  prettyDOM,
  queries,
} from '@testing-library/dom';
import { getScreenElement, resetScreenElement, setScreenElement } from './screen.js';

const mountedFixtures = new Set<IFixture<any>>();

type QueryApi = ReturnType<typeof getQueriesForElement>;

export interface RenderOptions<T extends object> {
  /**
   * The Aurelia component class/instance to use as the app root.
   */
  component?: T | Constructable<T>;
  /**
   * Additional container registrations passed to the fixture's DI container.
   */
  registrations?: unknown[];
  /**
   * If false, the fixture is created but not started.
   */
  autoStart?: boolean;
  /**
   * Custom TestContext (useful for advanced platform overrides).
   */
  ctx?: TestContext;
  /**
   * App config forwarded to Aurelia's app root (limited to fixture config).
   */
  appConfig?: FixtureConfig;
  /**
   * Partial custom element definition for the app root.
   */
  rootElementDef?: Partial<PartialCustomElementDefinition>;
  /**
   * Where to attach the test host (defaults to document.body).
   */
  attachTo?: HTMLElement;
  /**
   * Base element used by screen/queries (defaults to document.body or attachTo).
   */
  baseElement?: HTMLElement;
}

export interface RenderResult<T extends object> extends QueryApi {
  /**
   * The Aurelia fixture created for this render.
   */
  fixture: IFixture<ICustomElementViewModel & T>;
  /**
   * The root Aurelia component instance.
   */
  component: ICustomElementViewModel & T;
  /**
   * The element that Aurelia renders into (app host).
   */
  container: HTMLElement;
  /**
   * The element used for screen-bound queries.
   */
  baseElement: HTMLElement;
  /**
   * The host element created by the fixture (a wrapper div).
   */
  host: HTMLElement;
  /**
   * The TestContext used for the fixture.
   */
  ctx: TestContext;
  /**
   * Start the fixture if it was created with autoStart = false.
   */
  start: () => Promise<void>;
  /**
   * Stop and dispose the Aurelia app + remove host from the DOM.
   */
  unmount: () => Promise<void>;
  /**
   * Pretty-print the DOM to the console and return the string.
   */
  debug: (el?: HTMLElement, maxLength?: number) => string;
  /**
   * Snapshot the container as a DocumentFragment.
   */
  asFragment: () => DocumentFragment;
}

export type FixtureConfig = Pick<IAppRootConfig, 'allowActionlessForm'>;

export type RenderComponentOptions<T extends object> = Omit<RenderOptions<T>, 'component' | 'rootElementDef'>;

export const render = async <T extends object>(
  template: string | Node,
  options: RenderOptions<T> = {}
): Promise<RenderResult<T>> => {
  const {
    component,
    registrations = [],
    autoStart = true,
    ctx = TestContext.create(),
    appConfig = {},
    rootElementDef,
    attachTo,
    baseElement,
  } = options;

  const fixture = createFixture<T>(
    template,
    component as T | Constructable<T> | undefined,
    registrations,
    autoStart,
    ctx,
    appConfig,
    rootElementDef
  );

  if (attachTo != null) {
    attachTo.appendChild(fixture.testHost);
  }

  if (autoStart) {
    await fixture.startPromise;
  }

  const resolvedBase =
    baseElement ??
    attachTo ??
    fixture.testHost.ownerDocument.body ??
    fixture.testHost;
  const container = fixture.appHost;
  const queryApi = getQueriesForElement(resolvedBase, queries);

  setScreenElement(resolvedBase);
  mountedFixtures.add(fixture);

  const debug = (el: HTMLElement = resolvedBase, maxLength = 7000): string => {
    const output = prettyDOM(el, maxLength) || '';
    if (output.length > 0) {
      // eslint-disable-next-line no-console
      console.log(output);
    }
    return output;
  };

  let manualStartPromise: Promise<void> | null = null;
  const start = async (): Promise<void> => {
    if (autoStart) {
      await fixture.startPromise;
      return;
    }
    if (manualStartPromise == null) {
      const app = fixture.au.app({
        host: fixture.appHost,
        component: fixture.component,
        ...appConfig,
      });
      manualStartPromise = Promise.resolve(app.start());
    }
    await manualStartPromise;
  };

  const unmount = async (): Promise<void> => {
    mountedFixtures.delete(fixture);
    await fixture.stop(true);
    if (getScreenElement() === resolvedBase) {
      resetScreenElement();
    }
  };

  const asFragment = (): DocumentFragment => {
    const doc = container.ownerDocument;
    return doc.createRange().createContextualFragment(container.innerHTML);
  };

  return {
    ...queryApi,
    fixture: fixture as IFixture<ICustomElementViewModel & T>,
    component: fixture.component as ICustomElementViewModel & T,
    container,
    baseElement: resolvedBase,
    host: fixture.testHost,
    ctx: fixture.ctx,
    start,
    unmount,
    debug,
    asFragment,
  };
};

export const renderComponent = async <T extends object>(
  component: T | Constructable<T>,
  options: RenderComponentOptions<T> = {}
): Promise<RenderResult<T>> => {
  const componentType =
    typeof component === 'function'
      ? (component as Constructable<T>)
      : (component as object).constructor as Constructable<T>;
  const definition = CustomElement.getDefinition(componentType);
  if (definition == null || definition.template == null) {
    throw new Error('renderComponent: component is not a CustomElement.');
  }
  return render(definition.template, {
    ...options,
    component,
    rootElementDef: definition,
  });
};

export const cleanup = async (): Promise<void> => {
  const fixtures = Array.from(mountedFixtures);
  mountedFixtures.clear();
  for (const fixture of fixtures) {
    await fixture.stop(true);
  }
  resetScreenElement();
};
