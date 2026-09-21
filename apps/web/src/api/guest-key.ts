/**
 * A guest's id: `guest-` and a version 4 UUID, in the shape the API's `GUEST_KEY`
 * accepts (`apps/api/src/auth-routes.ts`).
 *
 * Not `crypto.randomUUID()`. A browser defines that only in a secure context — HTTPS
 * or localhost — so on a deployment still waiting for its certificate it is not a
 * function, and pressing "Open the engine" threw inside the click handler: the
 * screen stayed where it was, said nothing, and nobody could get in. Every test
 * passed, because every test runs on localhost. `getRandomValues` is defined in
 * every context and is the same generator underneath.
 */
export function guestKey(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const b = random(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `guest-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
