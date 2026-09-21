/**
 * A second DXF reader, for tests that must not take our writer's word for it.
 *
 * `dxf-parser` ships an ESM-shaped `.d.ts` over a CommonJS UMD bundle. Under
 * NodeNext the compiler types the default import as the module namespace; Node
 * hands back the constructor itself. The two disagree, and this is the one place
 * that reconciles them — checked at runtime rather than cast and hoped for, so a
 * future release that changes the shape fails here, by name.
 */

import DxfParserModule, { type IDxf } from 'dxf-parser';

type ParserCtor = new () => { parseSync(text: string): IDxf | null };

const Parser: ParserCtor = (() => {
  const candidate: unknown = DxfParserModule;
  if (typeof candidate === 'function') return candidate as ParserCtor;
  const nested: unknown = (candidate as { default?: unknown } | null)?.default;
  if (typeof nested === 'function') return nested as ParserCtor;
  throw new Error('dxf-parser no longer exports a constructor as its default; update test-support/dxf.ts');
})();

/** Parse a DXF, or throw — an empty result is a failed read, not an empty drawing. */
export function parseDxf(text: string): IDxf {
  const parsed = new Parser().parseSync(text);
  if (!parsed) throw new Error('dxf-parser returned nothing');
  return parsed;
}
