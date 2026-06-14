import {
  createUserEvent,
  setup,
  userEvent,
  type UserEvent,
  type UserEventSetupOptions,
} from '../../dist/index.js';

async function userEventApiTypes() {
  const options: UserEventSetupOptions = {
    delay: 5,
    settle: () => Promise.resolve(),
  };
  const user: UserEvent = createUserEvent(options);

  const input = document.createElement('input');

  await user.click(input);
  await user.type(input, '{Shift>}hello{/Shift}');
  await user.keyboard('{Control>}a{/Control}');

  const copied: string = await user.copy(input);
  const cut: string = await user.cut();
  copied.toUpperCase();
  cut.toUpperCase();

  // The default instance exposes setup().
  const scoped: UserEvent = userEvent.setup({ delay: 1 });
  await scoped.dblClick(input);
}

async function setupUserOverrideTypes() {
  const { user } = await setup('<input value.bind="name">', {
    component: class {
      name = '';
    },
    user: { settle: () => undefined },
  });
  await user.copy();
}

void userEventApiTypes;
void setupUserOverrideTypes;
