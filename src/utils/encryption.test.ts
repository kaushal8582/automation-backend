import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, maskToken } from './encryption.js';
import { aggregatePostStatus, computeDestinationCounts } from './post-status.js';

describe('encryption utils', () => {
  it('encrypts and decrypts tokens round-trip', () => {
    const token = 'IGQVJXexampleAccessToken123';
    const encrypted = encryptToken(token);

    expect(encrypted.startsWith('v1.')).toBe(true);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted)).toBe(token);
  });

  it('produces different ciphertext for the same plaintext', () => {
    const token = 'same-token-value';
    expect(encryptToken(token)).not.toBe(encryptToken(token));
  });

  it('masks tokens for logging', () => {
    expect(maskToken('abcdefghijklmnop')).toBe('abcd…mnop');
    expect(maskToken('')).toBe('[empty]');
  });
});

describe('post status aggregation', () => {
  it('returns scheduled when all destinations are pending', () => {
    expect(aggregatePostStatus(['pending', 'pending'])).toBe('scheduled');
  });

  it('returns queued when all destinations are queued', () => {
    expect(aggregatePostStatus(['queued', 'queued'])).toBe('queued');
  });

  it('returns scheduled when mix of pending and queued', () => {
    expect(aggregatePostStatus(['pending', 'queued'])).toBe('scheduled');
  });

  it('returns processing when any destination is processing', () => {
    expect(aggregatePostStatus(['pending', 'processing_media'])).toBe('processing');
  });

  it('returns published when all destinations published', () => {
    expect(aggregatePostStatus(['published', 'published'])).toBe('published');
  });

  it('returns partially_published for mixed success/failure', () => {
    expect(aggregatePostStatus(['published', 'failed', 'published'])).toBe('partially_published');
  });

  it('returns failed when all destinations failed', () => {
    expect(aggregatePostStatus(['failed', 'failed'])).toBe('failed');
  });

  it('computes destination counts', () => {
    expect(computeDestinationCounts(['published', 'failed', 'published', 'pending'])).toEqual({
      totalDestinations: 4,
      successfulDestinations: 2,
      failedDestinations: 1,
    });
  });
});
