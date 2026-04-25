import {
  getQueriesForElement,
  logDOM,
  queries as defaultQueries,
  screen as domScreen,
} from '@testing-library/dom';
import type { Queries, Screen as DomScreen } from '@testing-library/dom';

let currentElement: HTMLElement | null = null;
let currentQueries: Queries | null = null;
let cachedElement: HTMLElement | null = null;
let cachedQueriesSource: Queries | null = null;
let cachedQueries: DomScreen | null = null;

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

const resolveQueries = (): Queries => currentQueries ?? defaultQueries;

const createScreenApi = (element: HTMLElement, querySet: Queries): DomScreen => Object.assign(
  getQueriesForElement<Queries>(element, querySet),
  {
    debug: (
      el: Array<Element | HTMLDocument> | Element | HTMLDocument = element,
      maxLength?: number,
      options?: Parameters<DomScreen['debug']>[2]
    ): void => {
      if (Array.isArray(el)) {
        for (const current of el) {
          logDOM(current, maxLength, options);
        }
        return;
      }
      logDOM(el, maxLength, options);
    },
    logTestingPlaygroundURL: (el: Element | HTMLDocument = element): string =>
      domScreen.logTestingPlaygroundURL(el),
  }
) as unknown as DomScreen;

const getQueries = (): DomScreen => {
  const element = resolveElement();
  const querySet = resolveQueries();
  if (cachedQueries != null && cachedElement === element && cachedQueriesSource === querySet) {
    return cachedQueries;
  }
  cachedElement = element;
  cachedQueriesSource = querySet;
  cachedQueries = createScreenApi(element, querySet);
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
) as DomScreen;

export const setScreenElement = (element: HTMLElement, querySet: Queries = defaultQueries): void => {
  currentElement = element;
  currentQueries = querySet;
  cachedElement = element;
  cachedQueriesSource = querySet;
  cachedQueries = createScreenApi(element, querySet);
};

export const resetScreenElement = (): void => {
  currentElement = null;
  currentQueries = null;
  cachedElement = null;
  cachedQueriesSource = null;
  cachedQueries = null;
};

export const getScreenElement = (): HTMLElement | null => currentElement;
