import crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for handling encryption and decryption of sensitive data
 * Uses AES-256-GCM symmetric encryption
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits

  constructor(private readonly configService: ConfigService) {
    const configKey = this.configService.get<string>('encryption.key');

    if (!configKey) {
      this.logger.warn(
        'ENCRYPTION_KEY environment variable is not set. Using a default key for development. DO NOT USE IN PRODUCTION!',
      );
      // Default key for development only - 32 bytes (256 bits)
      this.encryptionKey = crypto.scryptSync('development-key-not-secure', 'salt', this.keyLength);
    } else {
      // Convert the hex string to a Buffer
      this.encryptionKey = Buffer.from(configKey, 'hex');

      // Validate key length
      if (this.encryptionKey.length !== this.keyLength) {
        throw new Error(
          `Encryption key must be ${this.keyLength * 2} hex characters (${this.keyLength} bytes)`,
        );
      }
    }
  }

  /**
   * Encrypts a string using AES-256-GCM
   * @param text The text to encrypt
   * @returns The encrypted text as a hex string with IV and auth tag prepended
   */
  encrypt(text: string | null | undefined): string | null {
    if (text === null || text === undefined) {
      return null;
    }

    if (text === '') {
      return '';
    }

    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt the data
      const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV, encrypted data, and auth tag
      return Buffer.concat([iv, authTag, encrypted]).toString('hex');
    } catch (error) {
      this.logger.error(`Error encrypting data: ${error.message}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts a string that was encrypted with the encrypt method
   * @param encryptedText The encrypted text as a hex string with IV and auth tag prepended
   * @returns The decrypted text
   */
  decrypt(encryptedText: string | null | undefined): string | null {
    if (encryptedText === null || encryptedText === undefined) {
      return null;
    }

    if (encryptedText === '') {
      return '';
    }

    try {
      // Convert the hex string to a Buffer
      const data = Buffer.from(encryptedText, 'hex');

      // Extract IV, auth tag, and encrypted data
      const iv = data.subarray(0, this.ivLength);
      const authTag = data.subarray(this.ivLength, this.ivLength + this.authTagLength);
      const encryptedData = data.subarray(this.ivLength + this.authTagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

      // Set auth tag
      decipher.setAuthTag(authTag);

      // Decrypt the data
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.warn(`Error decrypting data: ${error.message}`);
      return null; // Return null for failed decryption
    }
  }
}
