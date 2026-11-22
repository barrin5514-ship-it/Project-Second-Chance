import { describe, expect, it } from 'vitest';
import {
  isLoopbackHost,
  originAllowedForBootstrap,
  originAllowedForPost,
  safeEqual,
  issueSession,
  CSRF_HEADER,
  SESSION_COOKIE,
} from './sessionGuard';

const LOOPBACK_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];

describe('isLoopbackHost', () => {
  it.each(['127.0.0.1:5173', 'localhost:5173', '127.0.0.1:3001', 'localhost:3001'])(
    'accepts loopback host %s',
    (host) => {
      expect(isLoopbackHost(host)).toBe(true);
    },
  );

  it.each(['evil.example:5173', '127.0.0.1.evil.example', '0.0.0.0:5173', '', '192.168.1.5:5173'])(
    'rejects non-loopback host %s',
    (host) => {
      expect(isLoopbackHost(host)).toBe(false);
    },
  );

  it('rejects undefined host', () => {
    expect(isLoopbackHost(undefined)).toBe(false);
  });
});

describe('bootstrap origin rule (GET may omit Origin)', () => {
  it('allows a normal same-origin GET that sends no Origin header', () => {
    expect(originAllowedForBootstrap(undefined, LOOPBACK_ORIGINS)).toBe(true);
  });

  it('allows an Origin that is exactly one of the allowed loopback origins', () => {
    expect(originAllowedForBootstrap('http://127.0.0.1:5173', LOOPBACK_ORIGINS)).toBe(true);
  });

  it('rejects a present but foreign Origin', () => {
    expect(originAllowedForBootstrap('https://evil.example', LOOPBACK_ORIGINS)).toBe(false);
  });

  it('rejects a lookalike Origin', () => {
    expect(originAllowedForBootstrap('http://127.0.0.1:5173.evil.example', LOOPBACK_ORIGINS)).toBe(
      false,
    );
  });

  it('rejects the literal string null', () => {
    expect(originAllowedForBootstrap('null', LOOPBACK_ORIGINS)).toBe(false);
  });
});

describe('token POST origin rule (strict)', () => {
  it('rejects a missing Origin', () => {
    expect(originAllowedForPost(undefined, LOOPBACK_ORIGINS)).toBe(false);
  });

  it('accepts an exact allowed Origin', () => {
    expect(originAllowedForPost('http://localhost:5173', LOOPBACK_ORIGINS)).toBe(true);
  });

  it('rejects a foreign Origin', () => {
    expect(originAllowedForPost('https://evil.example', LOOPBACK_ORIGINS)).toBe(false);
  });
});

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('abcdef', 'abcdef')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(safeEqual('abcdef', 'abcdeg')).toBe(false);
  });

  it('returns false, without throwing, for unequal lengths', () => {
    expect(() => safeEqual('abc', 'abcdef')).not.toThrow();
    expect(safeEqual('abc', 'abcdef')).toBe(false);
  });

  it('returns false when either side is empty or missing', () => {
    expect(safeEqual('', '')).toBe(false);
    expect(safeEqual('', 'abc')).toBe(false);
    expect(safeEqual(undefined, 'abc')).toBe(false);
    expect(safeEqual('abc', undefined)).toBe(false);
  });
});

describe('issueSession', () => {
  it('mints an unguessable session id and a distinct CSRF token', () => {
    const a = issueSession();
    const b = issueSession();
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.csrfToken).not.toBe(b.csrfToken);
    expect(a.sessionId).toMatch(/^sid_[A-Za-z0-9_-]{20,}$/);
    expect(a.csrfToken).toMatch(/^csrf_[A-Za-z0-9_-]{20,}$/);
  });

  it('exposes the documented cookie and header names', () => {
    expect(SESSION_COOKIE).toBe('psc_sid');
    expect(CSRF_HEADER).toBe('x-psc-csrf');
  });

  it('is random across many issuances', () => {
    const ids = new Set(Array.from({ length: 100 }, () => issueSession().sessionId));
    expect(ids.size).toBe(100);
  });
});
