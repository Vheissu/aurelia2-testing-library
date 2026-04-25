import './auto-cleanup.js';

export { act, settle } from './act.js';
export type { SettleOptions } from './act.js';
export { enableAutoCleanup, disableAutoCleanup } from './auto-cleanup.js';
export { installAureliaTestEnvironment } from './environment.js';
export type { InstallAureliaTestEnvironmentOptions } from './environment.js';
export { spyOnEvent } from './events.js';
export type { EventSpy } from './events.js';
export {
  cleanup,
  createRender,
  defineExtension,
  render,
  renderAttribute,
  renderComponent,
  renderValueConverter,
  setup,
  setupComponent,
} from './render.js';
export type {
  ComponentUpdates,
  ExtensionExtras,
  RenderAttributeOptions,
  RenderAttributeResult,
  RenderComponentOptions,
  RenderExtension,
  RenderExtensionBeforeContext,
  RenderExtensionContext,
  RenderOptions,
  RenderPreset,
  RenderResult,
  RenderValueConverterOptions,
  RenderValueConverterResult,
  SetupComponentOptions,
  SetupOptions,
  SetupResult,
  TemplateInput,
  WrapperTemplate,
} from './render.js';
export { screen } from './screen.js';
export { userEvent, createUserEvent } from './user-event.js';
export type { UserEvent, UserEventApi, UserEventSetupOptions } from './user-event.js';

export {
  createFixture,
  ensureTaskQueuesEmpty,
  setPlatform,
  TestContext,
} from '@aurelia/testing';
export type { IFixture } from '@aurelia/testing';

export {
  fireEvent,
  within,
  waitFor,
  waitForElementToBeRemoved,
  getQueriesForElement,
  queries,
  prettyDOM,
  logDOM,
  configure,
} from '@testing-library/dom';

// Types can be imported directly from @testing-library/dom when needed.
