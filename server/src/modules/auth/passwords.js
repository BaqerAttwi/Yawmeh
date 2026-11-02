import {randomBytes, scrypt, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive = promisify(scrypt);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [algorithm, salt, encoded] = (stored || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(encoded || '')) return false;
  const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(encoded, 'hex'));
}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
