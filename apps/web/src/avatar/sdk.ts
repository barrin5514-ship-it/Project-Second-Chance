import type { ConversationLike, CreateConversationFn } from './connection';

/**
 * The only event types this wrapper forwards. They are members of the pinned
 * SDK's `ConversationEvent` union (`onChange`), NOT of a name-based emitter.
 */
export type SdkHandledEventType = 'avatar-presented' | 'session-ended';

export type SdkConversationEvent = { readonly type: string } & Record<string, unknown>;

/** The part of the pinned `Conversation` this wrapper relies on. */
export interface SdkConversation {
  onChange(handler: (event: SdkConversationEvent) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/** `createNuanceConversation` from `@nuancelabs/js-sdk`, as a value to inject. */
export type NuanceFactory = (options: Record<string, unknown>) => SdkConversation;

const SDK_GLOBAL = '__nuanceCreateConversation' as const;
const LOAD_COUNTER = '__pscSdkLoads' as const;
const REGISTRATION_COUNTER = '__pscSdkRegistrations' as const;

type SdkHost = {
  [SDK_GLOBAL]?: unknown;
  [LOAD_COUNTER]?: number;
  [REGISTRATION_COUNTER]?: number;
};

/**
 * Installs the pinned SDK's factory at page entry. Kept behind a function so
 * importing this module never imports (or evaluates) the SDK in tests.
 */
export function registerNuanceSdk(factory: NuanceFactory): void {
  const host = globalThis as SdkHost;
  host[SDK_GLOBAL] = factory;
  host[REGISTRATION_COUNTER] = (host[REGISTRATION_COUNTER] ?? 0) + 1;
}

/**
 * Adapts the pinned SDK to the small `ConversationLike` the connection wrapper
 * uses.
 *
 * - `ConversationLike.on(name, handler)` is implemented over the SDK's real
 *   `onChange(handler)`: the wrapper keeps its own name→handler sets and maps
 *   each discriminated `event.type` onto the names it subscribed to.
 * - `disconnect()` returns the SDK's promise, so callers can await it.
 * - Counting loads here lets the entry-path test prove the SDK is resolved
 *   lazily, only on the first explicit Start.
 */
export function createSdkAdapter(): { createConversation: CreateConversationFn } {
  return {
    createConversation(options) {
      const host = globalThis as SdkHost;
      host[LOAD_COUNTER] = (host[LOAD_COUNTER] ?? 0) + 1;
      const factory = host[SDK_GLOBAL];
      if (typeof factory !== 'function') {
        throw new Error('Nuance SDK is not available');
      }
      const conversation = (factory as NuanceFactory)(options);
      return wrapConversation(conversation);
    },
  };
}

function wrapConversation(conversation: SdkConversation): ConversationLike {
  const handlersByEvent = new Map<string, Set<(...args: unknown[]) => void>>();
  let subscribed = false;

  function subscribeOnce(): void {
    if (subscribed) return;
    subscribed = true;
    conversation.onChange((event) => {
      if (typeof event !== 'object' || event === null) return;
      const handlers = handlersByEvent.get(event.type);
      if (handlers === undefined) return;
      for (const handler of [...handlers]) handler(event);
    });
  }

  return {
    on(event, handler) {
      subscribeOnce();
      const set = handlersByEvent.get(event) ?? new Set<(...args: unknown[]) => void>();
      set.add(handler);
      handlersByEvent.set(event, set);
      return () => {
        set.delete(handler);
      };
    },
    connect: () => conversation.connect(),
    disconnect: () => conversation.disconnect(),
  };
}
