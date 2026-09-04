import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '../services/health.service.js';

describe('health.service', () => {
  it('returns structured health payload shape', async () => {
    const health = await getHealthStatus();

    expect(health).toHaveProperty('success');
    expect(health.services).toMatchObject({
      api: expect.any(String),
      mongodb: expect.any(String),
      redis: expect.any(String),
    });
    expect(health.services.api).toBe('ok');
  });
});
