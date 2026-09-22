/**
 * THE HASH A GATE IS SIGNED AGAINST — one function, for every screen that signs.
 *
 * A gate records what it acknowledged as a hash of its subject, and the server
 * recomputes that hash at export and refuses a signature given over different
 * content. So the client's function has to be the server's, byte for byte, and two
 * copies of it on two screens would be two chances to drift: the engine's export
 * step and the run page both sign G4, and a run page whose hash differed by one key
 * ordering would collect signatures the export then quietly refused.
 *
 * Canonical JSON (keys sorted at every depth), then 32-bit FNV-1a, as hex.
 */
export function hashOf(subject: unknown): string {
  const canonical = (v: unknown): string => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
    if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
    return `{${Object.entries(v as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, val]) => `${JSON.stringify(k)}:${canonical(val)}`)
      .join(',')}}`;
  };
  const payload = canonical(subject);
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
