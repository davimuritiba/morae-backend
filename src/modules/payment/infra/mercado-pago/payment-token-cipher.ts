import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class PaymentTokenCipher {
  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [ivText, tagText, encryptedText] = value.split('.');
    if (!ivText || !tagText || !encryptedText) {
      throw new ServiceUnavailableException(
        'As credenciais armazenadas do provedor estão inválidas.',
      );
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        Buffer.from(ivText, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedText, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível descriptografar as credenciais do provedor.',
      );
    }
  }

  private key(): Buffer {
    const value = process.env.PAYMENT_TOKEN_ENCRYPTION_KEY;
    if (!value) {
      throw new ServiceUnavailableException(
        'A variável PAYMENT_TOKEN_ENCRYPTION_KEY precisa ser configurada.',
      );
    }

    const key = Buffer.from(value, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'PAYMENT_TOKEN_ENCRYPTION_KEY precisa conter 32 bytes em base64.',
      );
    }
    return key;
  }
}
