// Mock mínimo de localStorage + window para tests en Node (sin jsdom).
// Las utilidades de storage/retention dependen de ambas APIs. Usa el
// EventTarget real de Node para permitir listeners/spies de window.

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

export function installTestEnv(): void {
  const g = globalThis as Record<string, unknown>;
  if (!g.localStorage) {
    g.localStorage = new MemoryStorage();
  }
  if (!g.window) {
    // Estructura mínima tipo Window sobre un EventTarget real.
    const base = new EventTarget();
    g.window = {
      addEventListener: base.addEventListener.bind(base),
      removeEventListener: base.removeEventListener.bind(base),
      dispatchEvent: base.dispatchEvent.bind(base),
    } as unknown as Window & typeof globalThis;
    g.EventTarget = EventTarget;
  }
  if (!g.CustomEvent) {
    g.CustomEvent = class CustomEvent extends Event {
      detail: unknown;
      constructor(type: string, init?: EventInit & { detail?: unknown }) {
        super(type, init);
        this.detail = init?.detail;
      }
    };
  }
}