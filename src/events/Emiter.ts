class Emitter<T extends Record<string, any>> {
  private eventHandlers: Map<keyof T, ((event: T[keyof T]) => void)[]> = new Map();
  private beforeHandlers: Map<keyof T, ((event: T[keyof T]) => void)[]> = new Map();
  private afterHandlers: Map<keyof T, ((event: T[keyof T]) => void)[]> = new Map();

  on<K extends keyof T>(eventName: K, handler: (event: T[K] & T[keyof T]) => void): void {
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventName, handlers);
  }

  once<K extends keyof T>(eventName: K, handler: (event: T[K]) => void): void {
    const onceHandler = (event: T[K]) => {
      handler(event);
      this.off(eventName, onceHandler);
    };
    this.on(eventName, onceHandler);
  }

  before<K extends keyof T>(eventName: K, handler: (event: T[K] & T[keyof T]) => void): void {
    const handlers = this.beforeHandlers.get(eventName) || [];
    handlers.push(handler);
    this.beforeHandlers.set(eventName, handlers);
  }

  after<K extends keyof T>(eventName: K, handler: (event: T[K] & T[keyof T]) => void): void {
    const handlers = this.afterHandlers.get(eventName) || [];
    handlers.push(handler);
    this.afterHandlers.set(eventName, handlers);
  }

  emit<K extends keyof T>(eventName: K, eventData: T[K]): void {
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };

    // Run 'before' handlers
    const beforeHandlers = this.beforeHandlers.get(eventName) || [];
    for (const handler of beforeHandlers) {
      handler({ ...eventData, cancel });
      if (cancelled) return;
    }

    // Run main handlers
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.forEach((handler) => handler(eventData));

    // Run 'after' handlers
    const afterHandlers = this.afterHandlers.get(eventName) || [];
    afterHandlers.forEach((handler) => handler(eventData));
  }

  off<K extends keyof T>(eventName: K, handler: (event: T[K]) => void): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      this.eventHandlers.set(
        eventName,
        handlers.filter((h) => h !== handler)
      );
    }
  }

  listenerCount<K extends keyof T>(eventName: K): number {
    return (this.eventHandlers.get(eventName) || []).length;
  }

  removeAllListeners<K extends keyof T>(eventName?: K): void {
    if (eventName) {
      this.eventHandlers.delete(eventName);
      this.beforeHandlers.delete(eventName);
      this.afterHandlers.delete(eventName);
    } else {
      this.eventHandlers.clear();
      this.beforeHandlers.clear();
      this.afterHandlers.clear();
    }
  }
}

export { Emitter };
