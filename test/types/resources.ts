import { ValueConverter } from '@aurelia/runtime-html';
import {
  createRender,
  renderValueConverter,
} from '../../dist/index.js';

class UpperValueConverter {
  toView(value: unknown): string {
    return String(value).toUpperCase();
  }

  helper(): string {
    return 'helper';
  }
}

class WrapValueConverter {
  toView(value: unknown, before: string, after: string): string {
    return `${before}${String(value)}${after}`;
  }
}

async function directValueConverterTypes() {
  const result = await renderValueConverter(UpperValueConverter, {
    name: 'upper',
    value: 'aurelia',
  });

  const converter: UpperValueConverter = result.converter;
  const helperValue: string = result.converter.helper();
  const target: HTMLElement = result.target;

  converter.toView('rc1').toLowerCase();
  helperValue.toUpperCase();
  target.focus();
}

async function presetValueConverterTypes() {
  const Wrap = ValueConverter.define('wrap', WrapValueConverter);
  const appRender = createRender();
  const result = await appRender.valueConverter(Wrap, {
    value: 'Aurelia',
    args: ["'<'", "'>'"],
  });

  const converter: WrapValueConverter = result.converter;
  const target: HTMLElement = result.target;

  converter.toView('rc1', '[', ']');
  target.focus();
}

void directValueConverterTypes;
void presetValueConverterTypes;
