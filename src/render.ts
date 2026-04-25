import type { Constructable } from '@aurelia/kernel';
import type {
  CustomAttributeType,
  ICustomAttributeController,
  ICustomAttributeViewModel,
  ICustomElementViewModel,
  IAppRootConfig,
  PartialCustomElementDefinition,
  ValueConverterInstance,
  ValueConverterType,
} from '@aurelia/runtime-html';
import { CustomAttribute, CustomElement, ValueConverter } from '@aurelia/runtime-html';
import { createFixture, type IFixture, TestContext } from '@aurelia/testing';
import {
  getQueriesForElement,
  prettyDOM,
  queries as defaultQueries,
} from '@testing-library/dom';
import type { BoundFunctions, Queries } from '@testing-library/dom';
import { settle as settleAurelia } from './act.js';
import { resetScreenElement, setScreenElement } from './screen.js';
import { createUserEvent, type UserEvent, type UserEventSetupOptions } from './user-event.js';

interface MountedRender {
  fixture: IFixture<any>;
  baseElement: HTMLElement;
  querySet: Queries;
  extensionCleanups: Array<() => unknown | Promise<unknown>>;
  extensionsCleaned: boolean;
  unmounted: boolean;
}

const mountedRenders: MountedRender[] = [];

type DefaultQueries = typeof defaultQueries;
type QueryApi<TQueries extends Queries = DefaultQueries> = BoundFunctions<DefaultQueries & TQueries>;
type AnyRenderExtension = RenderExtension<any, any, any>;
type UnionToIntersection<T extends object> = (T extends unknown ? (value: T) => void : never) extends
  (value: infer TIntersection) => void
  ? TIntersection & object
  : never;
type ExtensionExtraOf<TExtension> =
  TExtension extends RenderExtension<infer TExtra, any, any> ? TExtra : never;

export type ExtensionExtras<TExtensions extends readonly AnyRenderExtension[]> =
  TExtensions[number] extends never
    ? object
    : UnionToIntersection<ExtensionExtraOf<TExtensions[number]> & object>;

export type TemplateInput = string | Node;

export type WrapperTemplate =
  | string
  | ((template: TemplateInput) => TemplateInput);

export type ComponentUpdates<T extends object> =
  | Partial<T>
  | ((component: ICustomElementViewModel & T) => void | Promise<void>);

export interface RenderExtensionBeforeContext<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
> {
  template: TemplateInput;
  options: RenderOptions<T, TQueries, TExtensions>;
}

export interface RenderExtensionContext<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensionApi extends object = object,
> {
  template: TemplateInput;
  options: RenderOptions<T, TQueries, readonly AnyRenderExtension[]>;
  querySet: DefaultQueries & TQueries;
  result: RenderResult<T, TQueries, TExtensionApi>;
}

export interface RenderExtension<
  TExtra extends object = object,
  T extends object = object,
  TQueries extends Queries = DefaultQueries,
> {
  name?: string;
  beforeRender?: (
    context: RenderExtensionBeforeContext<T, TQueries, readonly AnyRenderExtension[]>
  ) => TemplateInput | void | Promise<TemplateInput | void>;
  extend?: (
    result: RenderResult<T, TQueries>,
    context: RenderExtensionContext<T, TQueries>
  ) => TExtra | void | Promise<TExtra | void>;
  cleanup?: (
    result: RenderResult<T, TQueries, Partial<TExtra>>,
    context: RenderExtensionContext<T, TQueries, Partial<TExtra>>
  ) => void | Promise<void>;
}

export interface RenderOptions<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
> {
  /**
   * The Aurelia component class/instance to use as the app root.
   */
  component?: T | Constructable<T>;
  /**
   * Initial values assigned to the root component before awaiting startup.
   */
  props?: Partial<T>;
  /**
   * Wrap the rendered template, similar to Testing Library's wrapper option.
   * String wrappers must include <slot></slot>, <slot />, or {{children}}.
   */
  wrapper?: WrapperTemplate;
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
  /**
   * App-specific DOM Testing Library queries to merge with the defaults.
   */
  queries?: TQueries;
  /**
   * Render extensions that can add project-specific helpers and cleanup hooks.
   */
  extensions?: TExtensions;
}

export type RenderResult<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensionApi extends object = object,
> = QueryApi<TQueries> & TExtensionApi & {
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
  /**
   * Assign root component values and flush Aurelia queues.
   */
  rerender: (updates: ComponentUpdates<T>) => Promise<void>;
  /**
   * Flush pending microtasks and Aurelia task queues.
   */
  settle: typeof settleAurelia;
};

export type FixtureConfig = Pick<IAppRootConfig, 'allowActionlessForm'>;

export type RenderComponentOptions<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
> = Omit<RenderOptions<T, TQueries, TExtensions>, 'component' | 'rootElementDef'>;

export interface SetupOptions<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
> extends RenderOptions<T, TQueries, TExtensions> {
  /**
   * Pass user-event options or an existing user instance.
   */
  user?: UserEventSetupOptions | UserEvent;
}

export type SetupResult<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensionApi extends object = object,
> = RenderResult<T, TQueries, TExtensionApi> & {
  user: UserEvent;
};

export type SetupComponentOptions<
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
> = Omit<SetupOptions<T, TQueries, TExtensions>, 'component' | 'rootElementDef'>;

export interface RenderAttributeOptions<
  TRoot extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
> extends Omit<RenderOptions<TRoot, TQueries, TExtensions>, 'rootElementDef'> {
  /**
   * Host element tag used for the custom attribute.
   */
  host?: string;
  /**
   * Extra attributes added to the host element.
   */
  hostAttrs?: Record<string, string | number | boolean | null | undefined>;
  /**
   * Raw custom attribute value, e.g. highlight="primary".
   */
  attributeValue?: string;
  /**
   * Binding expression, e.g. highlight.bind="color".
   */
  attributeBinding?: string;
  /**
   * Inner HTML placed in the host.
   */
  content?: string;
}

export type RenderAttributeResult<
  TAttribute extends object,
  TRoot extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensionApi extends object = object,
> = RenderResult<TRoot, TQueries, TExtensionApi> & {
  target: HTMLElement;
  attribute: ICustomAttributeViewModel & TAttribute;
  attributeController: ICustomAttributeController<ICustomAttributeViewModel & TAttribute>;
};

export interface RenderValueConverterOptions<
  TRoot extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
> extends Omit<RenderOptions<TRoot, TQueries, TExtensions>, 'rootElementDef'> {
  /**
   * Name to register the converter with when passing an undecorated class.
   */
  name?: string;
  /**
   * Initial value assigned to `value` on the root component.
   */
  value?: unknown;
  /**
   * Binding expression passed into the value converter (defaults to `value`).
   */
  expression?: string;
  /**
   * Raw Aurelia expressions appended as value converter arguments.
   */
  args?: string | readonly string[];
  /**
   * Host element tag used for the rendered value.
   */
  host?: string;
  /**
   * Extra attributes added to the host element.
   */
  hostAttrs?: Record<string, string | number | boolean | null | undefined>;
}

export type RenderValueConverterResult<
  TConverter extends object,
  TRoot extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensionApi extends object = object,
> = RenderResult<TRoot, TQueries, TExtensionApi> & {
  target: HTMLElement;
  converter: ValueConverterInstance<TConverter>;
};

export type RenderPreset<
  TDefault extends object = object,
  TQueries extends Queries = DefaultQueries,
  TDefaultExtensions extends readonly AnyRenderExtension[] = readonly [],
> = {
  <T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    template: TemplateInput,
    options?: RenderOptions<T, TQueries, TExtensions>
  ): Promise<RenderResult<T, TQueries, ExtensionExtras<readonly [...TDefaultExtensions, ...TExtensions]>>>;
  setup: <T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    template: TemplateInput,
    options?: SetupOptions<T, TQueries, TExtensions>
  ) => Promise<SetupResult<T, TQueries, ExtensionExtras<readonly [...TDefaultExtensions, ...TExtensions]>>>;
  component: <T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    component: T | Constructable<T>,
    options?: RenderComponentOptions<T, TQueries, TExtensions>
  ) => Promise<RenderResult<T, TQueries, ExtensionExtras<readonly [...TDefaultExtensions, ...TExtensions]>>>;
  setupComponent: <T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    component: T | Constructable<T>,
    options?: SetupComponentOptions<T, TQueries, TExtensions>
  ) => Promise<SetupResult<T, TQueries, ExtensionExtras<readonly [...TDefaultExtensions, ...TExtensions]>>>;
  attribute: <
    TAttribute extends object,
    T extends object = TDefault,
    TExtensions extends readonly AnyRenderExtension[] = readonly [],
  >(
    attribute: Constructable<TAttribute> | CustomAttributeType<Constructable<TAttribute>>,
    options?: RenderAttributeOptions<T, TQueries, TExtensions>
  ) => Promise<RenderAttributeResult<TAttribute, T, TQueries, ExtensionExtras<readonly [...TDefaultExtensions, ...TExtensions]>>>;
  valueConverter: <
    TConverter extends object,
    T extends object = TDefault,
    TExtensions extends readonly AnyRenderExtension[] = readonly [],
  >(
    converter: Constructable<TConverter> | ValueConverterType<Constructable<TConverter>>,
    options?: RenderValueConverterOptions<T, TQueries, TExtensions>
  ) => Promise<RenderValueConverterResult<TConverter, T, TQueries, ExtensionExtras<readonly [...TDefaultExtensions, ...TExtensions]>>>;
};

const wrapperSlotPattern = /<slot(?:\s[^>]*)?>\s*<\/slot>|<slot(?:\s[^>]*)?\/>/i;
const childrenPlaceholderPattern = /\{\{\s*children\s*\}\}/;
const childrenPlaceholderGlobalPattern = /\{\{\s*children\s*\}\}/g;

const mergeQueries = <TQueries extends Queries = DefaultQueries>(
  customQueries?: TQueries
): DefaultQueries & TQueries => ({
  ...defaultQueries,
  ...(customQueries ?? {}),
}) as DefaultQueries & TQueries;

const mergeRenderOptions = <
  T extends object,
  TQueries extends Queries,
  TDefaultExtensions extends readonly AnyRenderExtension[],
  TExtensions extends readonly AnyRenderExtension[],
>(
  defaults: RenderOptions<any, TQueries, TDefaultExtensions>,
  options: RenderOptions<T, TQueries, TExtensions> = {}
): RenderOptions<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]> => ({
  ...defaults,
  ...options,
  appConfig: {
    ...(defaults.appConfig ?? {}),
    ...(options.appConfig ?? {}),
  },
  props: {
    ...(defaults.props ?? {}),
    ...(options.props ?? {}),
  } as Partial<T>,
  registrations: [
    ...(defaults.registrations ?? []),
    ...(options.registrations ?? []),
  ],
  queries: {
    ...(defaults.queries ?? {}),
    ...(options.queries ?? {}),
  } as TQueries,
  extensions: [
    ...(defaults.extensions ?? []),
    ...(options.extensions ?? []),
  ] as unknown as readonly [...TDefaultExtensions, ...TExtensions],
});

const applyWrapper = (template: TemplateInput, wrapper?: WrapperTemplate): TemplateInput => {
  if (wrapper == null) {
    return template;
  }
  if (typeof wrapper === 'function') {
    return wrapper(template);
  }
  if (typeof template !== 'string') {
    throw new Error('render: string wrappers require a string template. Use a wrapper function for Node templates.');
  }
  if (childrenPlaceholderPattern.test(wrapper)) {
    return wrapper.replace(childrenPlaceholderGlobalPattern, template);
  }
  if (wrapperSlotPattern.test(wrapper)) {
    return wrapper.replace(wrapperSlotPattern, template);
  }
  throw new Error('render: wrapper templates must include <slot></slot>, <slot />, or {{children}}.');
};

const applyComponentUpdates = async <T extends object>(
  component: ICustomElementViewModel & T,
  updates: ComponentUpdates<T>
): Promise<void> => {
  if (typeof updates === 'function') {
    await updates(component);
    return;
  }
  Object.assign(component, updates);
};

const isUserEvent = (value: unknown): value is UserEvent =>
  value != null && typeof value === 'object' && typeof (value as UserEvent).click === 'function';

const createUser = (value: UserEventSetupOptions | UserEvent | undefined): UserEvent => {
  if (isUserEvent(value)) {
    return value;
  }
  return createUserEvent(value);
};

export const defineExtension = <
  TExtra extends object = object,
  T extends object = object,
  TQueries extends Queries = DefaultQueries,
>(
  extension: RenderExtension<TExtra, T, TQueries>
): RenderExtension<TExtra, T, TQueries> => extension;

const getExtensionName = (extension: AnyRenderExtension, index: number): string =>
  extension.name == null || extension.name.length === 0 ? `extension ${index + 1}` : extension.name;

const assignExtensionApi = (
  result: Record<PropertyKey, unknown>,
  api: object,
  extensionName: string
): void => {
  for (const key of Reflect.ownKeys(api)) {
    if (key in result) {
      throw new Error(`Render extension "${extensionName}" tried to overwrite existing result property "${String(key)}".`);
    }
    Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(api, key)!);
  }
};

const runExtensionCleanups = async (mountedRender: MountedRender): Promise<void> => {
  if (mountedRender.extensionsCleaned) {
    return;
  }
  for (const cleanup of [...mountedRender.extensionCleanups].reverse()) {
    await cleanup();
  }
  mountedRender.extensionsCleaned = true;
};

const refreshScreenAfterUnmount = (): void => {
  const currentRender = mountedRenders[mountedRenders.length - 1];
  if (currentRender != null) {
    setScreenElement(currentRender.baseElement, currentRender.querySet);
    return;
  }
  resetScreenElement();
};

const unmountMountedRender = async (mountedRender: MountedRender): Promise<void> => {
  if (mountedRender.unmounted) {
    return;
  }
  await runExtensionCleanups(mountedRender);
  await mountedRender.fixture.stop(true);
  mountedRender.unmounted = true;
  const index = mountedRenders.indexOf(mountedRender);
  if (index !== -1) {
    mountedRenders.splice(index, 1);
  }
  refreshScreenAfterUnmount();
};

export const render = async <
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
>(
  template: TemplateInput,
  options: RenderOptions<T, TQueries, TExtensions> = {} as RenderOptions<T, TQueries, TExtensions>
): Promise<RenderResult<T, TQueries, ExtensionExtras<TExtensions>>> => {
  const extensions = [...(options.extensions ?? [])] as AnyRenderExtension[];
  let currentTemplate = template;
  for (let i = 0; i < extensions.length; i += 1) {
    const nextTemplate = await extensions[i].beforeRender?.({
      template: currentTemplate,
      options: options as unknown as RenderOptions<T, TQueries, readonly AnyRenderExtension[]>,
    });
    if (nextTemplate !== undefined) {
      currentTemplate = nextTemplate;
    }
  }

  const {
    component,
    props,
    wrapper,
    registrations = [],
    autoStart = true,
    ctx = TestContext.create(),
    appConfig = {},
    rootElementDef,
    attachTo,
    baseElement,
    queries,
  } = options;

  const resolvedTemplate = applyWrapper(currentTemplate, wrapper);
  const fixture = createFixture<T>(
    resolvedTemplate,
    component as T | Constructable<T> | undefined,
    registrations,
    false,
    ctx,
    appConfig,
    rootElementDef
  );

  if (props != null) {
    Object.assign(fixture.component, props);
  }

  if (attachTo != null) {
    attachTo.appendChild(fixture.testHost);
  }

  const resolvedBase =
    baseElement ??
    attachTo ??
    fixture.testHost.ownerDocument.body ??
    fixture.testHost;
  const container = fixture.appHost;
  const querySet = mergeQueries(queries);
  const queryApi = getQueriesForElement(resolvedBase, querySet);
  const mountedRender: MountedRender = {
    fixture,
    baseElement: resolvedBase,
    querySet,
    extensionCleanups: [],
    extensionsCleaned: false,
    unmounted: false,
  };

  mountedRenders.push(mountedRender);
  setScreenElement(resolvedBase, querySet);

  const debug = (el: HTMLElement = resolvedBase, maxLength = 7000): string => {
    const output = prettyDOM(el, maxLength) || '';
    if (output.length > 0) {
      // eslint-disable-next-line no-console
      console.log(output);
    }
    return output;
  };

  let startPromise: Promise<void> | null = null;
  const start = async (): Promise<void> => {
    if (startPromise == null) {
      startPromise = Promise.resolve(fixture.start()).then(() => undefined);
    }
    await startPromise;
    await settleAurelia();
  };

  const unmount = async (): Promise<void> => {
    await unmountMountedRender(mountedRender);
  };

  const asFragment = (): DocumentFragment => {
    const doc = container.ownerDocument;
    return doc.createRange().createContextualFragment(container.innerHTML);
  };

  const rerender = async (updates: ComponentUpdates<T>): Promise<void> => {
    await applyComponentUpdates(fixture.component as ICustomElementViewModel & T, updates);
    await settleAurelia();
  };

  const result = {
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
    rerender,
    settle: settleAurelia,
  } as RenderResult<T, TQueries>;

  try {
    if (autoStart) {
      await start();
    }
    const context: RenderExtensionContext<T, TQueries> = {
      template: resolvedTemplate,
      options: options as unknown as RenderOptions<T, TQueries, readonly AnyRenderExtension[]>,
      querySet,
      result,
    };
    for (let i = 0; i < extensions.length; i += 1) {
      const extension = extensions[i];
      const extensionName = getExtensionName(extension, i);
      const extensionApi = await extension.extend?.(result, context);
      if (extensionApi != null) {
        assignExtensionApi(result as Record<PropertyKey, unknown>, extensionApi, extensionName);
      }
      if (extension.cleanup != null) {
        mountedRender.extensionCleanups.push(async () => {
          await extension.cleanup!(
            result as RenderResult<T, TQueries, object>,
            context as RenderExtensionContext<T, TQueries, object>
          );
        });
      }
    }
  } catch (error) {
    await unmountMountedRender(mountedRender);
    throw error;
  }

  return result as RenderResult<T, TQueries, ExtensionExtras<TExtensions>>;
};

export const renderComponent = async <
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
>(
  component: T | Constructable<T>,
  options: RenderComponentOptions<T, TQueries, TExtensions> = {}
): Promise<RenderResult<T, TQueries, ExtensionExtras<TExtensions>>> => {
  const componentType =
    typeof component === 'function'
      ? (component as Constructable<T>)
      : (component as object).constructor as Constructable<T>;
  const definition = CustomElement.getDefinition(componentType);
  if (definition == null || definition.template == null) {
    throw new Error('renderComponent: component is not a CustomElement.');
  }
  return render<T, TQueries, TExtensions>(definition.template, {
    ...options,
    component,
    rootElementDef: definition,
  } as RenderOptions<T, TQueries, TExtensions>);
};

export const setup = async <
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
>(
  template: TemplateInput,
  options: SetupOptions<T, TQueries, TExtensions> = {}
): Promise<SetupResult<T, TQueries, ExtensionExtras<TExtensions>>> => {
  const user = createUser(options.user);
  const result = await render<T, TQueries, TExtensions>(template, options);
  return {
    ...result,
    user,
  } as SetupResult<T, TQueries, ExtensionExtras<TExtensions>>;
};

export const setupComponent = async <
  T extends object,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
>(
  component: T | Constructable<T>,
  options: SetupComponentOptions<T, TQueries, TExtensions> = {}
): Promise<SetupResult<T, TQueries, ExtensionExtras<TExtensions>>> => {
  const user = createUser(options.user);
  const result = await renderComponent<T, TQueries, TExtensions>(component, options);
  return {
    ...result,
    user,
  } as SetupResult<T, TQueries, ExtensionExtras<TExtensions>>;
};

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

const serializeHostAttrs = (attrs: RenderAttributeOptions<object>['hostAttrs'] = {}): string =>
  Object.entries(attrs)
    .flatMap(([name, value]) => {
      if (value === false || value == null) {
        return [];
      }
      if (value === true) {
        return [name];
      }
      return [`${name}="${escapeAttribute(String(value))}"`];
    })
    .join(' ');

const normalizeValueConverterArgs = (args: RenderValueConverterOptions<object>['args']): string => {
  if (args == null) {
    return '';
  }
  if (typeof args === 'string') {
    return `:${args}`;
  }
  return args.map(arg => `:${arg}`).join('');
};

const resolveValueConverter = <TConverter extends object>(
  converter: Constructable<TConverter> | ValueConverterType<Constructable<TConverter>>,
  name?: string
): ValueConverterType<Constructable<TConverter>> => {
  if (ValueConverter.isType(converter)) {
    return converter as ValueConverterType<Constructable<TConverter>>;
  }
  try {
    ValueConverter.getDefinition(converter as Constructable<TConverter>);
    return converter as ValueConverterType<Constructable<TConverter>>;
  } catch {
    if (name == null || name.length === 0) {
      throw new Error(
        'renderValueConverter: converter is not a ValueConverter. Pass ValueConverter.define(...) or provide options.name.'
      );
    }
    return ValueConverter.define(name, converter as Constructable<TConverter>);
  }
};

export const renderAttribute = async <
  TAttribute extends object,
  TRoot extends object = Record<PropertyKey, unknown>,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
>(
  attribute: Constructable<TAttribute> | CustomAttributeType<Constructable<TAttribute>>,
  options: RenderAttributeOptions<TRoot, TQueries, TExtensions> = {}
): Promise<RenderAttributeResult<TAttribute, TRoot, TQueries, ExtensionExtras<TExtensions>>> => {
  const definition = CustomAttribute.getDefinition(attribute as Constructable<TAttribute>);
  if (definition == null) {
    throw new Error('renderAttribute: attribute is not a CustomAttribute.');
  }

  const host = options.host ?? 'div';
  const hostAttrs = serializeHostAttrs(options.hostAttrs);
  const attributeExpression = options.attributeBinding != null
    ? `${definition.name}.bind="${escapeAttribute(options.attributeBinding)}"`
    : options.attributeValue != null
      ? `${definition.name}="${escapeAttribute(options.attributeValue)}"`
      : definition.name;
  const targetMarker = 'data-atl-attribute-target';
  const attrs = [hostAttrs, targetMarker, attributeExpression].filter(Boolean).join(' ');
  const template = `<${host}${attrs ? ` ${attrs}` : ''}>${options.content ?? ''}</${host}>`;
  const result = await render<TRoot, TQueries, TExtensions>(template, {
    ...options,
    registrations: [
      attribute,
      ...(options.registrations ?? []),
    ],
  } as RenderOptions<TRoot, TQueries, TExtensions>);
  const target = result.container.querySelector<HTMLElement>(`[${targetMarker}]`);
  if (target == null) {
    throw new Error(`renderAttribute: rendered target for "${definition.name}" was not found.`);
  }
  target.removeAttribute(targetMarker);
  const attributeController = CustomAttribute.closest(
    target,
    definition.name
  ) as ICustomAttributeController<ICustomAttributeViewModel & TAttribute> | null;
  if (attributeController == null) {
    throw new Error(`renderAttribute: controller for "${definition.name}" was not found.`);
  }

  return {
    ...result,
    target,
    attribute: attributeController.viewModel,
    attributeController,
  } as RenderAttributeResult<TAttribute, TRoot, TQueries, ExtensionExtras<TExtensions>>;
};

export const renderValueConverter = async <
  TConverter extends object,
  TRoot extends object = Record<PropertyKey, unknown>,
  TQueries extends Queries = DefaultQueries,
  TExtensions extends readonly AnyRenderExtension[] = readonly [],
>(
  converter: Constructable<TConverter> | ValueConverterType<Constructable<TConverter>>,
  options: RenderValueConverterOptions<TRoot, TQueries, TExtensions> = {}
): Promise<RenderValueConverterResult<TConverter, TRoot, TQueries, ExtensionExtras<TExtensions>>> => {
  const converterType = resolveValueConverter(converter, options.name);
  const definition = ValueConverter.getDefinition(converterType);
  const host = options.host ?? 'span';
  const hostAttrs = serializeHostAttrs(options.hostAttrs);
  const targetMarker = 'data-atl-value-converter-target';
  const attrs = [hostAttrs, targetMarker].filter(Boolean).join(' ');
  const expression = options.expression ?? 'value';
  const converterArgs = normalizeValueConverterArgs(options.args);
  const template = `<${host}${attrs ? ` ${attrs}` : ''}>\${${expression} | ${definition.name}${converterArgs}}</${host}>`;
  const result = await render<TRoot, TQueries, TExtensions>(template, {
    ...options,
    props: {
      ...(options.value === undefined ? {} : { value: options.value }),
      ...(options.props ?? {}),
    } as Partial<TRoot>,
    registrations: [
      converterType,
      ...(options.registrations ?? []),
    ],
  } as RenderOptions<TRoot, TQueries, TExtensions>);
  const target = result.container.querySelector<HTMLElement>(`[${targetMarker}]`);
  if (target == null) {
    throw new Error(`renderValueConverter: rendered target for "${definition.name}" was not found.`);
  }
  target.removeAttribute(targetMarker);

  return {
    ...result,
    target,
    converter: ValueConverter.get(result.fixture.container, definition.name) as ValueConverterInstance<TConverter>,
  } as RenderValueConverterResult<TConverter, TRoot, TQueries, ExtensionExtras<TExtensions>>;
};

export const createRender = <
  TDefault extends object = object,
  TQueries extends Queries = DefaultQueries,
  TDefaultExtensions extends readonly AnyRenderExtension[] = readonly [],
>(
  defaults: RenderOptions<TDefault, TQueries, TDefaultExtensions> = {} as RenderOptions<TDefault, TQueries, TDefaultExtensions>
): RenderPreset<TDefault, TQueries, TDefaultExtensions> => {
  const preset = (<T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    template: TemplateInput,
    options: RenderOptions<T, TQueries, TExtensions> = {}
  ) => render<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>(
    template,
    mergeRenderOptions(defaults, options)
  )) as RenderPreset<TDefault, TQueries, TDefaultExtensions>;

  preset.setup = <T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    template: TemplateInput,
    options: SetupOptions<T, TQueries, TExtensions> = {}
  ) => setup<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>(
    template,
    mergeRenderOptions(defaults, options) as SetupOptions<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>
  );

  preset.component = <T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    component: T | Constructable<T>,
    options: RenderComponentOptions<T, TQueries, TExtensions> = {}
  ) => renderComponent<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>(
    component,
    mergeRenderOptions(defaults, options)
  );

  preset.setupComponent = <T extends object = TDefault, TExtensions extends readonly AnyRenderExtension[] = readonly []>(
    component: T | Constructable<T>,
    options: SetupComponentOptions<T, TQueries, TExtensions> = {}
  ) => setupComponent<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>(
    component,
    mergeRenderOptions(defaults, options) as SetupComponentOptions<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>
  );

  preset.attribute = <
    TAttribute extends object,
    T extends object = TDefault,
    TExtensions extends readonly AnyRenderExtension[] = readonly [],
  >(
    attribute: Constructable<TAttribute> | CustomAttributeType<Constructable<TAttribute>>,
    options: RenderAttributeOptions<T, TQueries, TExtensions> = {}
  ) => renderAttribute<TAttribute, T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>(
    attribute,
    mergeRenderOptions(defaults, options) as RenderAttributeOptions<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>
  );

  preset.valueConverter = <
    TConverter extends object,
    T extends object = TDefault,
    TExtensions extends readonly AnyRenderExtension[] = readonly [],
  >(
    converter: Constructable<TConverter> | ValueConverterType<Constructable<TConverter>>,
    options: RenderValueConverterOptions<T, TQueries, TExtensions> = {}
  ) => renderValueConverter<TConverter, T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>(
    converter,
    mergeRenderOptions(defaults, options) as RenderValueConverterOptions<T, TQueries, readonly [...TDefaultExtensions, ...TExtensions]>
  );

  return preset;
};

export const cleanup = async (): Promise<void> => {
  let firstError: unknown;

  for (const mountedRender of [...mountedRenders]) {
    try {
      await unmountMountedRender(mountedRender);
    } catch (error) {
      if (firstError === undefined) {
        firstError = error;
      }
    }
  }

  refreshScreenAfterUnmount();

  if (firstError !== undefined) {
    throw firstError;
  }
};
