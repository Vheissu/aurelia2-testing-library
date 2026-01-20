import { getQueriesForElement, queries } from '@testing-library/dom';

let currentElement: HTMLElement | null = null;
let cachedElement: HTMLElement | null = null;
let cachedQueries: ReturnType<typeof getQueriesForElement> | null = null;

const resolveElement = (): HTMLElement => {
  if (currentElement != null) {
    return currentElement;
  }
  if (typeof document === 'undefined' || document.body == null) {
    throw new Error(
      'No document available. Did you forget to set up a DOM environment (e.g. jsdom)?'
    );
  }
  return document.body;
};

const getQueries = (): ReturnType<typeof getQueriesForElement> => {
  const element = resolveElement();
  if (cachedQueries != null && cachedElement === element) {
    return cachedQueries;
  }
  cachedElement = element;
  cachedQueries = getQueriesForElement(element, queries);
  return cachedQueries;
};

export const screen = new Proxy(
  {},
  {
    get(_target, prop) {
      const api = getQueries() as Record<string | symbol, unknown>;
      const value = api[prop];
      if (typeof value === 'function') {
        return value.bind(api);
      }
      return value;
    },
  }
) as ReturnType<typeof getQueriesForElement>;

export const setScreenElement = (element: HTMLElement): void => {
  currentElement = element;
  cachedElement = element;
  cachedQueries = getQueriesForElement(element, queries);
};

export const resetScreenElement = (): void => {
  currentElement = null;
  cachedElement = null;
  cachedQueries = null;
};

export const getScreenElement = (): HTMLElement | null => currentElement;
