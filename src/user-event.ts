export interface UserEventSetupOptions {
  /**
   * Delay in ms between key presses when typing.
   */
  delay?: number;
  /**
   * Provide a timer advance helper (useful with fake timers).
   */
  advanceTimers?: (ms: number) => void | Promise<void>;
  /**
   * Default document to use when one cannot be inferred from the element.
   */
  document?: Document;
}

export interface TypeOptions {
  delay?: number;
}

export interface UserEvent {
  click: (target: Element) => Promise<void>;
  dblClick: (target: Element) => Promise<void>;
  tripleClick: (target: Element) => Promise<void>;
  rightClick: (target: Element) => Promise<void>;
  hover: (target: Element) => Promise<void>;
  unhover: (target: Element) => Promise<void>;
  focus: (target: Element) => Promise<void>;
  blur: (target: Element) => Promise<void>;
  type: (target: Element, text: string, options?: TypeOptions) => Promise<void>;
  keyboard: (text: string, options?: TypeOptions) => Promise<void>;
  clear: (target: Element) => Promise<void>;
  paste: (target: Element, text: string) => Promise<void>;
  upload: (target: HTMLInputElement, files: File | File[]) => Promise<void>;
  selectOptions: (
    target: HTMLSelectElement,
    values: string | string[] | HTMLOptionElement | HTMLOptionElement[]
  ) => Promise<void>;
  deselectOptions: (
    target: HTMLSelectElement,
    values: string | string[] | HTMLOptionElement | HTMLOptionElement[]
  ) => Promise<void>;
  tab: (options?: { shift?: boolean }) => Promise<void>;
  pointer: (actions: PointerAction[] | PointerAction) => Promise<void>;
}

type ParsedToken =
  | { kind: 'char'; value: string }
  | { kind: 'special'; value: string };

export interface PointerAction {
  target?: Element;
  type: 'move' | 'down' | 'up' | 'over' | 'out' | 'enter' | 'leave' | 'cancel';
  pointerType?: 'mouse' | 'pen' | 'touch';
  button?: number;
  buttons?: number;
  clientX?: number;
  clientY?: number;
}

const specialKeys: Record<string, { key: string; code: string; char?: string }> = {
  enter: { key: 'Enter', code: 'Enter' },
  tab: { key: 'Tab', code: 'Tab' },
  'shift+tab': { key: 'Tab', code: 'Tab' },
  backspace: { key: 'Backspace', code: 'Backspace' },
  delete: { key: 'Delete', code: 'Delete' },
  esc: { key: 'Escape', code: 'Escape' },
  escape: { key: 'Escape', code: 'Escape' },
  space: { key: ' ', code: 'Space', char: ' ' },
  arrowleft: { key: 'ArrowLeft', code: 'ArrowLeft' },
  arrowright: { key: 'ArrowRight', code: 'ArrowRight' },
  arrowup: { key: 'ArrowUp', code: 'ArrowUp' },
  arrowdown: { key: 'ArrowDown', code: 'ArrowDown' },
};

const isHTMLElement = (el: Element): el is HTMLElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLElement ?? HTMLElement);

const tagEquals = (el: Element, tag: string): boolean =>
  el.tagName.toLowerCase() === tag;

const isInputElement = (el: Element): el is HTMLInputElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLInputElement ?? HTMLInputElement) || tagEquals(el, 'input');

const isTextAreaElement = (el: Element): el is HTMLTextAreaElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLTextAreaElement ?? HTMLTextAreaElement) || tagEquals(el, 'textarea');

const isSelectElement = (el: Element): el is HTMLSelectElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLSelectElement ?? HTMLSelectElement) || tagEquals(el, 'select');

const isOptionElement = (el: Element): el is HTMLOptionElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLOptionElement ?? HTMLOptionElement) || tagEquals(el, 'option');

const isButtonElement = (el: Element): el is HTMLButtonElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLButtonElement ?? HTMLButtonElement) || tagEquals(el, 'button');

const isLabelElement = (el: Element): el is HTMLLabelElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLLabelElement ?? HTMLLabelElement) || tagEquals(el, 'label');

const isFormElement = (el: Element): el is HTMLFormElement =>
  el instanceof (el.ownerDocument.defaultView?.HTMLFormElement ?? HTMLFormElement) || tagEquals(el, 'form');

const escapeCss = (value: string): string => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
};

const getDoc = (target?: Element, fallback?: Document): Document => {
  if (target != null) {
    return target.ownerDocument;
  }
  if (fallback != null) {
    return fallback;
  }
  if (typeof document === 'undefined') {
    throw new Error('No document available. Did you set up a DOM environment?');
  }
  return document;
};

const getWin = (doc: Document): Window & typeof globalThis => {
  return (doc.defaultView ?? globalThis) as Window & typeof globalThis;
};

const isDisabled = (el: Element): boolean => {
  return 'disabled' in el && Boolean((el as HTMLInputElement).disabled);
};

const isFocusable = (el: Element): boolean => {
  if (!isHTMLElement(el) || isDisabled(el)) {
    return false;
  }
  const tag = el.tagName.toLowerCase();
  if (['input', 'select', 'textarea', 'button'].includes(tag)) {
    return true;
  }
  if (tag === 'a') {
    return Boolean((el as HTMLAnchorElement).href);
  }
  return el.tabIndex >= 0;
};

const focusElement = (el: Element): void => {
  if (!isHTMLElement(el)) {
    return;
  }
  const doc = el.ownerDocument;
  if (doc.activeElement === el) {
    return;
  }
  if (typeof el.focus === 'function') {
    el.focus();
    return;
  }
  const win = getWin(doc);
  el.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
  el.dispatchEvent(new win.FocusEvent('focus', { bubbles: false }));
};

const blurElement = (el: Element): void => {
  if (!isHTMLElement(el)) {
    return;
  }
  const doc = el.ownerDocument;
  if (doc.activeElement !== el) {
    return;
  }
  if (typeof el.blur === 'function') {
    el.blur();
    return;
  }
  const win = getWin(doc);
  el.dispatchEvent(new win.FocusEvent('focusout', { bubbles: true }));
  el.dispatchEvent(new win.FocusEvent('blur', { bubbles: false }));
};

const fireMouse = (el: Element, type: string, init?: MouseEventInit): void => {
  const win = getWin(el.ownerDocument);
  el.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
};

const firePointer = (el: Element, type: string, init?: PointerEventInit): void => {
  const win = getWin(el.ownerDocument);
  if (win.PointerEvent == null) {
    return;
  }
  el.dispatchEvent(
    new win.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      ...init,
    })
  );
};

const mouseFromPointer = (type: PointerAction['type']): string | null => {
  switch (type) {
    case 'move':
      return 'mousemove';
    case 'down':
      return 'mousedown';
    case 'up':
      return 'mouseup';
    case 'over':
      return 'mouseover';
    case 'out':
      return 'mouseout';
    case 'enter':
      return 'mouseenter';
    case 'leave':
      return 'mouseleave';
    default:
      return null;
  }
};

const fireKeyboard = (el: Element, type: string, init: KeyboardEventInit): void => {
  const win = getWin(el.ownerDocument);
  el.dispatchEvent(new win.KeyboardEvent(type, { bubbles: true, cancelable: true, ...init }));
};

const fireInput = (el: Element, inputType: string, data: string | null): void => {
  const win = getWin(el.ownerDocument);
  if (typeof win.InputEvent === 'function') {
    el.dispatchEvent(
      new win.InputEvent('input', {
        bubbles: true,
        cancelable: false,
        inputType,
        data,
      })
    );
    return;
  }
  el.dispatchEvent(new win.Event('input', { bubbles: true, cancelable: false }));
};

const fireChange = (el: Element): void => {
  const win = getWin(el.ownerDocument);
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
};

const fireClipboard = (el: Element, type: string, text: string): void => {
  const win = getWin(el.ownerDocument);
  const data = { getData: () => text } as unknown as DataTransfer;
  const event = typeof win.ClipboardEvent === 'function'
    ? new win.ClipboardEvent(type, { bubbles: true, cancelable: true, clipboardData: data })
    : new win.Event(type, { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
};

const parseText = (text: string): ParsedToken[] => {
  const tokens: ParsedToken[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '\\' && text[i + 1] === '{') {
      tokens.push({ kind: 'char', value: '{' });
      i += 2;
      continue;
    }
    if (char === '{') {
      const end = text.indexOf('}', i + 1);
      if (end > i + 1) {
        const value = text.slice(i + 1, end).toLowerCase();
        tokens.push({ kind: 'special', value });
        i = end + 1;
        continue;
      }
    }
    tokens.push({ kind: 'char', value: char });
    i += 1;
  }
  return tokens;
};

const getValue = (el: Element): string => {
  if (isInputElement(el) || isTextAreaElement(el)) {
    return el.value;
  }
  if (el instanceof HTMLElement && el.isContentEditable) {
    return el.textContent ?? '';
  }
  return '';
};

const setValue = (el: Element, value: string): void => {
  if (isInputElement(el) || isTextAreaElement(el)) {
    el.value = value;
    return;
  }
  if (el instanceof HTMLElement && el.isContentEditable) {
    el.textContent = value;
    return;
  }
  throw new Error('Element is not editable');
};

const setFiles = (input: HTMLInputElement, files: File[]): void => {
  const win = input.ownerDocument.defaultView;
  let fileList: FileList | File[];
  if (win?.DataTransfer != null) {
    const dt = new win.DataTransfer();
    for (const file of files) {
      dt.items.add(file);
    }
    fileList = dt.files;
  } else {
    fileList = files;
  }
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: fileList,
  });
};

const resolveOptions = (
  target: HTMLSelectElement,
  values: string | string[] | HTMLOptionElement | HTMLOptionElement[]
): HTMLOptionElement[] => {
  const optionsArray = Array.isArray(values) ? values : [values];
  return optionsArray.map(item => {
    if (typeof item === 'object' && item !== null && isOptionElement(item as Element)) {
      return item as HTMLOptionElement;
    }
    const byValue = Array.from(target.options).find(option => option.value === item);
    if (byValue != null) {
      return byValue;
    }
    const byText = Array.from(target.options).find(option => option.textContent === item);
    if (byText != null) {
      return byText;
    }
    throw new Error(`Option "${item}" not found`);
  });
};

const waitDelay = async (delay: number, advanceTimers?: UserEventSetupOptions['advanceTimers']): Promise<void> => {
  if (delay <= 0) {
    return;
  }
  if (advanceTimers != null) {
    await advanceTimers(delay);
    return;
  }
  await new Promise(resolve => setTimeout(resolve, delay));
};

const getFocusableElements = (doc: Document): HTMLElement[] => {
  const nodes = Array.from(
    doc.querySelectorAll<HTMLElement>(
      'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])'
    )
  );
  return nodes.filter(node => !isDisabled(node));
};

const moveFocus = (doc: Document, shift?: boolean): void => {
  const focusables = getFocusableElements(doc);
  if (focusables.length === 0) {
    return;
  }
  const active = doc.activeElement as HTMLElement | null;
  const currentIndex = active ? focusables.indexOf(active) : -1;
  const nextIndex = shift
    ? (currentIndex - 1 + focusables.length) % focusables.length
    : (currentIndex + 1) % focusables.length;
  const next = focusables[nextIndex];
  if (active != null && active !== next) {
    blurElement(active);
  }
  focusElement(next);
};

export const createUserEvent = (options: UserEventSetupOptions = {}): UserEvent => {
  const baseDelay = options.delay ?? 0;

  const click = async (target: Element): Promise<void> => {
    if (isDisabled(target)) {
      return;
    }
    if (isLabelElement(target)) {
      const control = target.control ?? (target.htmlFor ? target.ownerDocument.getElementById(target.htmlFor) : null);
      if (control != null) {
        target = control;
      }
    }
    const wasChecked = isInputElement(target) ? target.checked : undefined;
    firePointer(target, 'pointerover');
    firePointer(target, 'pointerenter');
    fireMouse(target, 'mouseover');
    fireMouse(target, 'mouseenter');
    firePointer(target, 'pointerdown', { buttons: 1 });
    fireMouse(target, 'mousedown', { buttons: 1, button: 0 });
    if (isFocusable(target)) {
      focusElement(target);
    }
    firePointer(target, 'pointerup', { buttons: 0 });
    fireMouse(target, 'mouseup', { buttons: 0, button: 0 });
    fireMouse(target, 'click', { buttons: 0, button: 0 });

    if (isOptionElement(target)) {
      const select = target.closest('select');
      if (select != null) {
        if (!select.multiple) {
          select.value = target.value;
        } else {
          target.selected = !target.selected;
        }
        fireInput(select, 'insertReplacementText', null);
        fireChange(select);
      }
    }

    if (isInputElement(target)) {
      if (target.type === 'checkbox') {
        if (wasChecked === target.checked) {
          target.checked = !target.checked;
        }
        fireInput(target, 'insertReplacementText', null);
        fireChange(target);
      } else if (target.type === 'radio') {
        if (!target.checked) {
          target.checked = true;
          if (target.name) {
            const radios = Array.from(
              target.ownerDocument.querySelectorAll<HTMLInputElement>(
                `input[type="radio"][name="${escapeCss(target.name)}"]`
              )
            );
            for (const radio of radios) {
              if (radio !== target) {
                radio.checked = false;
              }
            }
          }
          fireInput(target, 'insertReplacementText', null);
          fireChange(target);
        }
      }
    }
  };

  const dblClick = async (target: Element): Promise<void> => {
    await click(target);
    await click(target);
    fireMouse(target, 'dblclick', { buttons: 0, button: 0 });
  };

  const tripleClick = async (target: Element): Promise<void> => {
    await click(target);
    await click(target);
    fireMouse(target, 'dblclick', { buttons: 0, button: 0 });
    await click(target);
  };

  const rightClick = async (target: Element): Promise<void> => {
    if (isDisabled(target)) {
      return;
    }
    firePointer(target, 'pointerdown', { buttons: 2 });
    fireMouse(target, 'mousedown', { buttons: 2, button: 2 });
    if (isFocusable(target)) {
      focusElement(target);
    }
    firePointer(target, 'pointerup', { buttons: 0 });
    fireMouse(target, 'mouseup', { buttons: 0, button: 2 });
    fireMouse(target, 'contextmenu', { buttons: 0, button: 2 });
  };

  const hover = async (target: Element): Promise<void> => {
    firePointer(target, 'pointerover');
    firePointer(target, 'pointerenter');
    fireMouse(target, 'mouseover');
    fireMouse(target, 'mouseenter');
  };

  const unhover = async (target: Element): Promise<void> => {
    firePointer(target, 'pointerout');
    firePointer(target, 'pointerleave');
    fireMouse(target, 'mouseout');
    fireMouse(target, 'mouseleave');
  };

  const focus = async (target: Element): Promise<void> => {
    focusElement(target);
  };

  const blur = async (target: Element): Promise<void> => {
    blurElement(target);
  };

  const type = async (target: Element, text: string, opts?: TypeOptions): Promise<void> => {
    if (!isHTMLElement(target)) {
      throw new Error('Target must be an HTMLElement');
    }
    if (isDisabled(target)) {
      return;
    }
    if (!isFocusable(target)) {
      focusElement(target);
    } else {
      focusElement(target);
    }

    const delay = opts?.delay ?? baseDelay;
    const tokens = parseText(text);

    for (const token of tokens) {
      if (delay > 0) {
        await waitDelay(delay, options.advanceTimers);
      }

      if (token.kind === 'char') {
        const key = token.value;
        fireKeyboard(target, 'keydown', { key, code: key });
        fireKeyboard(target, 'keypress', { key, code: key });
        const current = getValue(target);
        setValue(target, current + key);
        fireInput(target, 'insertText', key);
        fireKeyboard(target, 'keyup', { key, code: key });
        continue;
      }

      const special = specialKeys[token.value];
      if (special == null) {
        const key = `{${token.value}}`;
        fireKeyboard(target, 'keydown', { key, code: key });
        fireKeyboard(target, 'keypress', { key, code: key });
        fireKeyboard(target, 'keyup', { key, code: key });
        continue;
      }

      const key = special.key;
      const code = special.code;
      fireKeyboard(target, 'keydown', { key, code });

      if (token.value === 'tab' || token.value === 'shift+tab') {
        fireKeyboard(target, 'keyup', { key, code });
        const doc = getDoc(target, options.document);
        moveFocus(doc, token.value === 'shift+tab');
        continue;
      }

      if (token.value === 'backspace' || token.value === 'delete') {
        const current = getValue(target);
        if (current.length > 0) {
          setValue(target, current.slice(0, -1));
          fireInput(target, 'deleteContentBackward', null);
        }
        fireKeyboard(target, 'keyup', { key, code });
        continue;
      }

      if (special.char != null) {
        const current = getValue(target);
        setValue(target, current + special.char);
        fireInput(target, 'insertText', special.char);
      }

      fireKeyboard(target, 'keyup', { key, code });
    }
  };

  const keyboard = async (text: string, opts?: TypeOptions): Promise<void> => {
    const doc = getDoc(undefined, options.document);
    const active = doc.activeElement;
    if (active == null) {
      throw new Error('No active element to send keyboard input to');
    }
    await type(active, text, opts);
  };

  const clear = async (target: Element): Promise<void> => {
    if (isDisabled(target)) {
      return;
    }
    focusElement(target);
    setValue(target, '');
    fireInput(target, 'deleteContentBackward', null);
    fireChange(target);
  };

  const paste = async (target: Element, text: string): Promise<void> => {
    if (isDisabled(target)) {
      return;
    }
    focusElement(target);
    fireClipboard(target, 'paste', text);
    const current = getValue(target);
    setValue(target, current + text);
    fireInput(target, 'insertFromPaste', text);
  };

  const upload = async (target: HTMLInputElement, files: File | File[]): Promise<void> => {
    if (isDisabled(target)) {
      return;
    }
    if (target.type !== 'file') {
      throw new Error('Target input is not type="file"');
    }
    const fileList = Array.isArray(files) ? files : [files];
    setFiles(target, fileList);
    fireInput(target, 'insertReplacementText', null);
    fireChange(target);
  };

  const selectOptions = async (
    target: HTMLSelectElement,
    values: string | string[] | HTMLOptionElement | HTMLOptionElement[]
  ): Promise<void> => {
    if (isDisabled(target)) {
      return;
    }
    const optionElements = resolveOptions(target, values);

    if (!target.multiple) {
      optionElements[0].selected = true;
    } else {
      for (const option of optionElements) {
        option.selected = true;
      }
    }

    fireInput(target, 'insertReplacementText', null);
    fireChange(target);
  };

  const deselectOptions = async (
    target: HTMLSelectElement,
    values: string | string[] | HTMLOptionElement | HTMLOptionElement[]
  ): Promise<void> => {
    if (isDisabled(target)) {
      return;
    }
    if (!target.multiple) {
      throw new Error('deselectOptions only works on <select multiple>');
    }
    const optionElements = resolveOptions(target, values);
    for (const option of optionElements) {
      option.selected = false;
    }
    fireInput(target, 'deleteContentBackward', null);
    fireChange(target);
  };

  const tab = async (opts?: { shift?: boolean }): Promise<void> => {
    const doc = getDoc(undefined, options.document);
    const active = doc.activeElement;
    if (active != null) {
      fireKeyboard(active, 'keydown', {
        key: 'Tab',
        code: 'Tab',
        shiftKey: Boolean(opts?.shift),
      });
    }
    moveFocus(doc, opts?.shift);
    const next = doc.activeElement;
    if (next != null) {
      fireKeyboard(next, 'keyup', {
        key: 'Tab',
        code: 'Tab',
        shiftKey: Boolean(opts?.shift),
      });
    }
  };

  const pointer = async (actions: PointerAction[] | PointerAction): Promise<void> => {
    const steps = Array.isArray(actions) ? actions : [actions];
    let current: Element | null = null;
    for (const action of steps) {
      if (action.target != null) {
        current = action.target;
      }
      if (current == null) {
        throw new Error('Pointer action requires a target element');
      }
      const buttons = action.buttons ?? (action.type === 'down' ? 1 : 0);
      const button = action.button ?? (action.type === 'down' ? 0 : 0);
      firePointer(current, `pointer${action.type}`, {
        buttons,
        button,
        pointerType: action.pointerType ?? 'mouse',
        clientX: action.clientX,
        clientY: action.clientY,
      });
      const mouseType = mouseFromPointer(action.type);
      if (mouseType != null && (action.pointerType ?? 'mouse') === 'mouse') {
        fireMouse(current, mouseType, {
          buttons,
          button,
          clientX: action.clientX,
          clientY: action.clientY,
        });
      }
      if (action.type === 'down' && isFocusable(current)) {
        focusElement(current);
      }
    }
  };

  return {
    click,
    dblClick,
    tripleClick,
    rightClick,
    hover,
    unhover,
    focus,
    blur,
    type,
    keyboard,
    clear,
    paste,
    upload,
    selectOptions,
    deselectOptions,
    tab,
    pointer,
  };
};

export const userEvent = createUserEvent();
