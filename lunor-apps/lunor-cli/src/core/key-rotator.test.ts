import { describe, it, expect } from 'vitest';
import { FREE_MODEL_KEYS, getNextFreeModelKey, maskKey } from './key-rotator.js';

describe('Key Rotator', () => {
  describe('getNextFreeModelKey', () => {
    it('should return the first key if no current key is provided', () => {
      const nextKey = getNextFreeModelKey();
      expect(nextKey).toBe(FREE_MODEL_KEYS[0]);
    });

    it('should return the first key if current key is invalid', () => {
      const nextKey = getNextFreeModelKey('invalid-key');
      expect(nextKey).toBe(FREE_MODEL_KEYS[0]);
    });

    it('should rotate to the second key when the first key is provided', () => {
      const nextKey = getNextFreeModelKey(FREE_MODEL_KEYS[0]);
      expect(nextKey).toBe(FREE_MODEL_KEYS[1]);
    });

    it('should wrap around to the first key when the last key is provided', () => {
      const nextKey = getNextFreeModelKey(FREE_MODEL_KEYS[FREE_MODEL_KEYS.length - 1]);
      expect(nextKey).toBe(FREE_MODEL_KEYS[0]);
    });
  });

  describe('maskKey', () => {
    it('should return empty string for empty key', () => {
      expect(maskKey('')).toBe('');
    });

    it('should mask a typical key correctly', () => {
      const masked = maskKey('fe_oa_8b215212bbc4a5580daab973fb661dac8fcd63465156189a');
      expect(masked).toBe('fe_oa_8b21...189a');
    });

    it('should handle short keys safely', () => {
      expect(maskKey('short')).toBe('***');
    });
  });
});
