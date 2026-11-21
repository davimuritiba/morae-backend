import { createHmac, timingSafeEqual } from 'node:crypto';

export function isValidMercadoPagoSignature(input: {
  dataId: string;
  requestId: string;
  signature: string;
  secret: string;
}): boolean {
  const parts = new Map(
    input.signature
      .split(',')
      .map((part) => part.trim().split('=', 2) as [string, string]),
  );
  const timestamp = parts.get('ts');
  const receivedHash = parts.get('v1');
  if (!timestamp || !receivedHash || !/^[a-f\d]{64}$/i.test(receivedHash)) {
    return false;
  }

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
  const expectedHash = createHmac('sha256', input.secret)
    .update(manifest)
    .digest();
  const actualHash = Buffer.from(receivedHash, 'hex');
  return (
    actualHash.length === expectedHash.length &&
    timingSafeEqual(actualHash, expectedHash)
  );
}
