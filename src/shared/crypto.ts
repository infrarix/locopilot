'use strict';

import crypto from 'crypto';

export const KEY_PREFIX = 'tsk_';

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey(): { rawKey: string; keyHash: string } {
  const rawKey = `${KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyHash };
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
