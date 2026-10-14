import { generateKeyPairSync } from 'node:crypto';
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const prv = privateKey.export({ format: 'jwk' });
const b64u = s => Buffer.from(s, 'base64url').toString('base64url');
const publicRaw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]);
console.log('VAPID_PUBLIC_KEY=' + publicRaw.toString('base64url'));
console.log('VAPID_PRIVATE_KEY=' + b64u(prv.d));
console.log('VAPID_SUBJECT=mailto:you@example.com');
