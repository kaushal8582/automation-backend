import { describe, expect, it } from 'vitest';
import { getInstagramOAuthScopes } from '../config/instagram-oauth.js';

describe('instagram oauth config', () => {
  it('parses default publishing scopes', () => {
    const scopes = getInstagramOAuthScopes();
    expect(scopes).toContain('instagram_business_basic');
    expect(scopes).toContain('instagram_business_content_publish');
  });
});
