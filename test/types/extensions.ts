import {
  createRender,
  defineExtension,
  render,
  type RenderExtension,
} from '../../dist/index.js';

class AuthenticatedApp {
  currentUser = { name: 'Guest' };
}

const withAuth = defineExtension({
  name: 'auth-tools',
  beforeRender({ options }) {
    options.props = {
      ...(options.props ?? {}),
      currentUser: { name: 'Test User' },
    };
    return `<p>\${currentUser.name}</p>`;
  },
  extend(result) {
    return {
      getCurrentUserName: () => result.getByText('Test User').textContent ?? '',
      expectSignedIn: () => result.getByText('Test User'),
    };
  },
});

const withShell = defineExtension({
  name: 'shell-tools',
  extend() {
    return {
      getShell: (): HTMLElement => document.createElement('main'),
    };
  },
});

const cleanupOnly: RenderExtension = defineExtension({
  name: 'cleanup-only',
  cleanup() {
    document.body.dataset.cleaned = 'true';
  },
});

async function directRenderExtensionTypes() {
  const result = await render('<p>Auth</p>', {
    component: AuthenticatedApp,
    extensions: [withAuth, cleanupOnly],
  });

  const name: string = result.getCurrentUserName();
  const componentUserName: string = result.component.currentUser.name;
  const signedInElement: HTMLElement = result.expectSignedIn();

  name.toUpperCase();
  componentUserName.toUpperCase();
  signedInElement.focus();
}

async function presetExtensionTypes() {
  const appRender = createRender({
    component: AuthenticatedApp,
    extensions: [withAuth],
  });

  const result = await appRender('<p>Preset</p>', {
    extensions: [withShell],
  });

  const name: string = result.getCurrentUserName();
  const componentUserName: string = result.component.currentUser.name;
  const shell: HTMLElement = result.getShell();

  name.toUpperCase();
  componentUserName.toUpperCase();
  shell.focus();
}

void directRenderExtensionTypes;
void presetExtensionTypes;
