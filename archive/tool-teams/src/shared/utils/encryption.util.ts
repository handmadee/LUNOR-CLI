import CryptoJS from 'crypto-js';
import { config } from '../../config';

/**
 * Encryption Utilities
 * 
 * AES encryption/decryption for sensitive data.
 */
class EncryptionUtil {
  private readonly key: string;

  constructor() {
    this.key = config.encryptionKey;
  }

  /**
   * Encrypt a string
   */
  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.key).toString();
  }

  /**
   * Decrypt an encrypted string
   */
  decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

export const encryptionUtil = new EncryptionUtil();
