export const FREE_MODEL_KEYS = [
  'fe_oa_8b215212bbc4a5580daab973fb661dac8fcd63465156189a',
  'fe_oa_e1d47ee97a8aa3dbf480d391784c93ccc9ed9d1d956591b5'
];

/**
 * Returns the next key in the rotation list (round-robin).
 * If the current key is not found or not provided, returns the first key.
 */
export function getNextFreeModelKey(currentKey?: string): string {
  if (!currentKey) {
    return FREE_MODEL_KEYS[0];
  }
  const index = FREE_MODEL_KEYS.indexOf(currentKey);
  if (index === -1) {
    return FREE_MODEL_KEYS[0];
  }
  const nextIndex = (index + 1) % FREE_MODEL_KEYS.length;
  return FREE_MODEL_KEYS[nextIndex];
}

/**
 * Masks an API key for safe display in the terminal / UI.
 * e.g. fe_oa_8b215212bbc4a5580daab973fb661dac8fcd63465156189a -> fe_oa_8b21...189a
 */
export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '***';
  return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
}
