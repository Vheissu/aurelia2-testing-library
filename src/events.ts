export interface EventSpy<TEvent extends Event = Event> {
  readonly events: TEvent[];
  readonly count: number;
  readonly lastEvent: TEvent | undefined;
  next: () => Promise<TEvent>;
  dispose: () => void;
}

export const spyOnEvent = <TEvent extends Event = Event>(
  target: EventTarget,
  type: string,
  options?: AddEventListenerOptions
): EventSpy<TEvent> => {
  const events: TEvent[] = [];
  const waiters: Array<(event: TEvent) => void> = [];

  const listener = (event: Event): void => {
    const typedEvent = event as TEvent;
    events.push(typedEvent);
    const waiter = waiters.shift();
    if (waiter != null) {
      waiter(typedEvent);
    }
  };

  target.addEventListener(type, listener, options);

  return {
    events,
    get count() {
      return events.length;
    },
    get lastEvent() {
      return events[events.length - 1];
    },
    next: () => new Promise<TEvent>(resolve => {
      waiters.push(resolve);
    }),
    dispose: () => {
      target.removeEventListener(type, listener, options);
      waiters.length = 0;
    },
  };
};
