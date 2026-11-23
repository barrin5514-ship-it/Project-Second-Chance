import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { registerNuanceSdk, type NuanceFactory, type SdkConversationEvent } from './sdk';

/**
 * Acceptance for AC6: the page must actually present Mira's remote audio and
 * video, not merely report a connected status string. This uses the real App,
 * the real connection wrapper and the real SDK adapter; only the pinned SDK's
 * conversation object is a fake shaped like its documented `Conversation`
 * (`onChange`, `avatar.videoTrack/audioTrack`, `attach`/`detach`).
 */

interface FakeTrack {
  attach: ReturnType<typeof vi.fn>;
  detach: ReturnType<typeof vi.fn>;
}

function makeTrack(): FakeTrack {
  return { attach: vi.fn(), detach: vi.fn() };
}

interface FakeAvatar {
  readonly videoTrack: FakeTrack | null;
  readonly audioTrack: FakeTrack | null;
}

interface FakeSdkConversation {
  readonly avatar: FakeAvatar;
  onChange(handler: (event: SdkConversationEvent) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

function makeSdk(): {
  conversation: FakeSdkConversation;
  tracks: { videoTrack: FakeTrack | null; audioTrack: FakeTrack | null };
  emit: (type: string) => void;
} {
  const handlers = new Set<(event: SdkConversationEvent) => void>();
  const tracks: { videoTrack: FakeTrack | null; audioTrack: FakeTrack | null } = {
    videoTrack: makeTrack(),
    audioTrack: makeTrack(),
  };
  const conversation: FakeSdkConversation = {
    avatar: {
      get videoTrack() {
        return tracks.videoTrack;
      },
      get audioTrack() {
        return tracks.audioTrack;
      },
    },
    onChange(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    async connect() {
      // The documented order when media arrives: tracks, then ready, then
      // presented. The page's elements may not exist yet at this point.
      emit('tracks-changed');
      emit('avatar-ready');
      emit('avatar-presented');
    },
    async disconnect() {},
  };

  function emit(type: string): void {
    for (const handler of [...handlers]) handler({ type });
  }

  return { conversation, tracks, emit };
}

afterEach(() => {
  cleanup();
  delete (globalThis as { __nuanceCreateConversation?: unknown }).__nuanceCreateConversation;
});

function renderPrototype(): ReturnType<typeof render> {
  return render(
    <App
      tokens={{
        async fetchToken() {
          return { token: 'st_test_media_output_synthetic', attemptId: 'att_test_media_1' };
        },
        reset() {},
      }}
    />,
  );
}

describe('remote Mira output', () => {
  it('attaches the remote tracks to page elements, follows replacements and detaches on Stop', async () => {
    const sdk = makeSdk();
    const initialVideo = sdk.tracks.videoTrack as FakeTrack;
    const initialAudio = sdk.tracks.audioTrack as FakeTrack;
    registerNuanceSdk((() => sdk.conversation) as unknown as NuanceFactory);

    renderPrototype();
    fireEvent.click(screen.getByRole('button', { name: /start the test/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/connected/i));

    const video = document.querySelector('video');
    const audio = document.querySelector('audio');
    expect(video, 'the page needs an output video element for Mira').not.toBeNull();
    expect(audio, 'the page needs an output audio element for Mira').not.toBeNull();

    // Attached once the state made the elements available, even though the SDK
    // events fired before React rendered them.
    await waitFor(() => expect(initialVideo.attach).toHaveBeenCalledWith(video));
    expect(initialAudio.attach).toHaveBeenCalledWith(audio);

    // A later tracks-changed replaces the tracks: old ones detach, new attach.
    const nextVideo = makeTrack();
    const nextAudio = makeTrack();
    sdk.tracks.videoTrack = nextVideo;
    sdk.tracks.audioTrack = nextAudio;
    act(() => sdk.emit('tracks-changed'));

    expect(initialVideo.detach).toHaveBeenCalled();
    expect(initialAudio.detach).toHaveBeenCalled();
    expect(nextVideo.attach).toHaveBeenCalledWith(video);
    expect(nextAudio.attach).toHaveBeenCalledWith(audio);

    // Stop must release the output tracks as well as the call.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    });
    expect(nextVideo.detach).toHaveBeenCalled();
    expect(nextAudio.detach).toHaveBeenCalled();
  });

  it('detaches the remote tracks when the SDK ends the session', async () => {
    const sdk = makeSdk();
    const video = sdk.tracks.videoTrack as FakeTrack;
    const audio = sdk.tracks.audioTrack as FakeTrack;
    registerNuanceSdk((() => sdk.conversation) as unknown as NuanceFactory);

    renderPrototype();
    fireEvent.click(screen.getByRole('button', { name: /start the test/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/connected/i));
    await waitFor(() => expect(video.attach).toHaveBeenCalled());

    act(() => sdk.emit('session-ended'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/ended/i));
    expect(video.detach).toHaveBeenCalled();
    expect(audio.detach).toHaveBeenCalled();
  });

  it('detaches the remote tracks when the page unmounts', async () => {
    const sdk = makeSdk();
    const video = sdk.tracks.videoTrack as FakeTrack;
    const audio = sdk.tracks.audioTrack as FakeTrack;
    registerNuanceSdk((() => sdk.conversation) as unknown as NuanceFactory);

    const view = renderPrototype();
    fireEvent.click(screen.getByRole('button', { name: /start the test/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/connected/i));
    await waitFor(() => expect(video.attach).toHaveBeenCalled());

    view.unmount();

    expect(video.detach).toHaveBeenCalled();
    expect(audio.detach).toHaveBeenCalled();
  });

  it('tolerates a participant getter that throws before connect and after session end', async () => {
    const video = makeTrack();
    const audio = makeTrack();
    const handlers = new Set<(event: SdkConversationEvent) => void>();
    let connected = false;
    const conversation = {
      get avatar() {
        // The exported pinned facade does exactly this while there is no live
        // session: before connect() and after disconnect/session end.
        if (!connected) throw new Error('Not connected — call connect() first');
        return { videoTrack: video, audioTrack: audio };
      },
      onChange(handler: (event: SdkConversationEvent) => void) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      async connect() {
        connected = true;
        for (const type of ['tracks-changed', 'avatar-ready', 'avatar-presented']) {
          for (const handler of [...handlers]) handler({ type });
        }
      },
      async disconnect() {
        connected = false;
      },
    };
    registerNuanceSdk((() => conversation) as unknown as NuanceFactory);

    renderPrototype();
    fireEvent.click(screen.getByRole('button', { name: /start the test/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/connected/i));
    await waitFor(() => expect(video.attach).toHaveBeenCalled());
    expect(audio.attach).toHaveBeenCalled();

    // Ending the session makes the getter throw again; cleanup must not throw.
    expect(() => {
      act(() => {
        for (const handler of [...handlers]) handler({ type: 'session-ended' });
      });
    }).not.toThrow();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/ended/i));
    expect(video.detach).toHaveBeenCalled();
    expect(audio.detach).toHaveBeenCalled();
  });
});
