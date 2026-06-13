import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class ConfigCrypto {
  private static getKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, KEY_LENGTH);
  }

  private static getMachineId(): string {
    return process.env.USER || process.env.USERNAME || 'lunor-default';
  }

  static encrypt(text: string): string {
    const password = this.getMachineId();
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = this.getKey(password, salt);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');
  }

  static decrypt(encryptedData: string): string {
    const password = this.getMachineId();
    const buffer = Buffer.from(encryptedData, 'base64');

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = this.getKey(password, salt);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static isEncrypted(value: string): boolean {
    try {
      const buffer = Buffer.from(value, 'base64');
      return buffer.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
    } catch {
      return false;
    }
  }
}
