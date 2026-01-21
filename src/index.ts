export { render, renderComponent, cleanup } from './render.js';
export type { RenderOptions, RenderResult, RenderComponentOptions } from './render.js';
export { screen } from './screen.js';
export { userEvent, createUserEvent } from './user-event.js';

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
