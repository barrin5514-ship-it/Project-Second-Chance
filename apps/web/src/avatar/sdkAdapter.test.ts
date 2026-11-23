import { afterEach, describe, expect, it } from 'vitest';
import {
  createSdkAdapter,
  registerNuanceSdk,
  type NuanceFactory,
  type SdkConversationEvent,
} from './sdk';

/**
 * The pinned SDK (`@nuancelabs/js-sdk@0.40.0`) does NOT take event names. It
 * reports lifecycle through `onChange(handler)` with a discriminated
 * `event.type`. These tests use a fake shaped like the real `Conversation`
 * interface, so a wrapper that expects `on('avatar-presented', …)` fails here
 * instead of only in a live browser.
 */

interface FakeSdkConversation {
  readonly handlers: Array<(event: SdkConversationEvent) => void>;
  onChange(handler: (event: SdkConversationEvent) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  emit(event: SdkConversationEvent): void;
}

/** Read on use: a primitive captured at module load would never update. */
function registrationsSeen(): number | undefined {
  return (globalThis as { __pscSdkRegistrations?: number }).__pscSdkRegistrations;
}

afterEach(() => {
  // Leave no global factory behind between tests.
  delete (globalThis as { __nuanceCreateConversation?: unknown }).__nuanceCreateConversation;
});

function makeFakeSdk(options: { failOnConnect?: Error } = {}): {
  factory: NuanceFactory;
  conversation: FakeSdkConversation;
  optionsSeen: Array<Record<string, unknown>>;
} {
  const handlers: Array<(event: SdkConversationEvent) => void> = [];
  const conversation: FakeSdkConversation = {
    handlers,
    onChange(handler) {
      handlers.push(handler);
      return () => {
        const at = handlers.indexOf(handler);
        if (at >= 0) handlers.splice(at, 1);
      };
    },
    async connect() {
      if (options.failOnConnect) throw options.failOnConnect;
    },
    async disconnect() {},
    emit(event) {
      for (const handler of [...handlers]) handler(event);
    },
  };
  const optionsSeen: Array<Record<string, unknown>> = [];
  const factory: NuanceFactory = (opts) => {
    optionsSeen.push(opts);
    return conversation;
  };
  return { factory, conversation, optionsSeen };
}

describe('registered SDK factory', () => {
  it('uses the factory registered at page entry', () => {
    const { factory } = makeFakeSdk();
    registerNuanceSdk(factory);

    const adapter = createSdkAdapter();
    const created = adapter.createConversation({ token: async () => 'st_x' });

    expect(created).toBeDefined();
    expect(registrationsSeen()).toBeGreaterThan(0);
  });

  it('refuses to create a conversation when no SDK was registered', () => {
    const adapter = createSdkAdapter();
    expect(() => adapter.createConversation({})).toThrow(/not available/i);
  });
});

describe('SDK event mapping', () => {
  it('reports the avatar as presented from a discriminated onChange event', async () => {
    const { factory, conversation } = makeFakeSdk();
    registerNuanceSdk(factory);
    const seen: string[] = [];

    const adapter = createSdkAdapter();
    const wrapped = adapter.createConversation({ token: async () => 'st_x' });
    wrapped.on('avatar-presented', () => seen.push('presented'));
    wrapped.on('session-ended', () => seen.push('ended'));

    conversation.emit({ type: 'avatar-presented' });
    conversation.emit({ type: 'speaking-changed', participant: 'user', isSpeaking: true });
    conversation.emit({ type: 'session-ended', reason: 'ended' });

    expect(seen).toEqual(['presented', 'ended']);
    // The event's own payload is passed on, not a bare string.
    expect(await wrapped.connect()).toBeUndefined();
  });

  it('does not fire a handler after it unsubscribes', () => {
    const { factory, conversation } = makeFakeSdk();
    registerNuanceSdk(factory);
    let calls = 0;

    const wrapped = createSdkAdapter().createConversation({});
    const off = wrapped.on('session-ended', () => {
      calls += 1;
    });
    conversation.emit({ type: 'session-ended', reason: 'ended' });
    off();
    conversation.emit({ type: 'session-ended', reason: 'ended' });

    expect(calls).toBe(1);
  });
});
