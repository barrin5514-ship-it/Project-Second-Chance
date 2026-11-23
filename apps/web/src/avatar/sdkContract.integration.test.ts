import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNuanceConversation } from '@nuancelabs/js-sdk';
import { createAvatarConnection } from './connection';
import { createSdkAdapter, registerNuanceSdk } from './sdk';

/**
 * Regressions for the real pinned SDK contract and the consent boundary.
 *
 * The installed SDK's exported conversation facade throws when its `avatar`
 * participant is read before connect(); wrapping must therefore never read it
 * eagerly. The other two tests use synthetic failures only: no network, no
 * microphone, no credentials.
 */

afterEach(() => {
  delete (globalThis as { __nuanceCreateConversation?: unknown }).__nuanceCreateConversation;
});

describe('pinned SDK contract and consent ordering', () => {
  it('wraps a real SDK conversation without reading its pre-connect participant', () => {
    const token = vi.fn(async () => {
      throw new Error('No provider access is allowed in this regression test');
    });
    const raw = createNuanceConversation({ token, mediaDevices: { cameraEnabled: false } });

    // The actual pinned facade enforces readiness on this getter.
    expect(() => (raw as unknown as { avatar: unknown }).avatar).toThrow(/Not connected/i);

    registerNuanceSdk((() => raw) as never);
    const wrapped = createSdkAdapter().createConversation({ token });

    // Neither construction nor a guarded read of the participant may throw.
    expect(() => wrapped.avatar).not.toThrow();
    expect(wrapped.avatar).toBeUndefined();
    expect(token).not.toHaveBeenCalled();
  });

  it('recovers to unavailable when SDK construction throws synchronously', async () => {
    const connection = createAvatarConnection({
      tokens: {
        fetchToken: async () => ({
          token: 'st_test_construction_synthetic',
          attemptId: 'att_test_construction',
        }),
        reset() {},
        closeAttempt: async () => {},
      },
      createConversation() {
        throw new Error('synthetic SDK construction failure');
      },
    });

    await expect(connection.start()).rejects.toThrow();
    expect(connection.getState()).toBe('unavailable');
  });

  it('does not mint before the SDK asks for a token after microphone consent', async () => {
    const fetchToken = vi.fn(async () => ({
      token: 'st_test_permission_synthetic',
      attemptId: 'att_test_permission',
    }));
    const connection = createAvatarConnection({
      tokens: { fetchToken, reset() {}, closeAttempt: async () => {} },
      createConversation() {
        return {
          on: () => () => {},
          async connect() {
            // The documented order: the SDK asks for microphone permission and
            // fails before it ever calls the token callback.
            throw Object.assign(new Error('synthetic microphone denial'), {
              name: 'MediaAccessError',
              device: 'microphone',
              reason: 'permission-denied',
            });
          },
          disconnect() {},
        };
      },
    });

    await expect(connection.start()).rejects.toThrow();
    expect(connection.getState()).toBe('mic-denied');
    expect(fetchToken).not.toHaveBeenCalled();
  });
});
