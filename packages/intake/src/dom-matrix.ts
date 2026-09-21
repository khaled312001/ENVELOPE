/**
 * A 2D `DOMMatrix`, for pdfjs on a server that has no canvas.
 *
 * pdfjs's Node build takes `DOMMatrix` from `@napi-rs/canvas`, an optional native
 * dependency, and one of its module-level statements is `new DOMMatrix()` — so
 * without it the parser does not fail to render, it fails to IMPORT. On a laptop
 * the package installs with a Windows binary and nobody notices. On the Linux
 * shared host this deploys to it would be a 30 MB native library, downloaded for the
 * platform and loaded into a memory allowance shared with other sites, so that an
 * affection plan's TEXT can be read.
 *
 * Intake never renders. It reads positioned text, and pdfjs's text path does its
 * own matrix arithmetic in arrays (`Util.transform`). What needs `DOMMatrix` to
 * exist is the rendering half of the same module. So this is installed only when
 * no `DOMMatrix` exists, and it implements the 2D affine subset of the interface —
 * enough to construct, compose and invert, which is everything pdfjs calls.
 *
 * `packages/intake/test/dom-matrix.test.ts` checks it against the arithmetic the
 * spec defines, and `scripts/deploy` compares a release's readings of every sample
 * affection plan with the development server's before anything is uploaded.
 *
 *   | a  c  e |
 *   | b  d  f |
 *   | 0  0  1 |
 */

type Init = readonly number[] | Float32Array | Float64Array | MatrixLike | undefined;

interface MatrixLike {
  readonly a?: number;
  readonly b?: number;
  readonly c?: number;
  readonly d?: number;
  readonly e?: number;
  readonly f?: number;
  readonly m11?: number;
  readonly m12?: number;
  readonly m21?: number;
  readonly m22?: number;
  readonly m41?: number;
  readonly m42?: number;
}

export class AffineDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: Init) {
    if (init === undefined) return;
    if (typeof init === 'string') throw new TypeError('AffineDOMMatrix does not parse CSS transforms');
    if (ArrayBuffer.isView(init) || Array.isArray(init)) {
      const v = Array.from(init as ArrayLike<number>);
      if (v.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = v as [number, number, number, number, number, number];
      } else if (v.length === 16) {
        // Column-major 4×4; a 2D matrix lives in m11 m12 m21 m22 m41 m42.
        this.a = v[0]!;
        this.b = v[1]!;
        this.c = v[4]!;
        this.d = v[5]!;
        this.e = v[12]!;
        this.f = v[13]!;
      } else {
        throw new TypeError(`a matrix is 6 or 16 numbers, not ${v.length}`);
      }
      return;
    }
    const m = init as MatrixLike;
    this.a = m.a ?? m.m11 ?? 1;
    this.b = m.b ?? m.m12 ?? 0;
    this.c = m.c ?? m.m21 ?? 0;
    this.d = m.d ?? m.m22 ?? 1;
    this.e = m.e ?? m.m41 ?? 0;
    this.f = m.f ?? m.m42 ?? 0;
  }

  static fromMatrix(other?: MatrixLike): AffineDOMMatrix {
    return new AffineDOMMatrix(other);
  }

  static fromFloat64Array(v: Float64Array): AffineDOMMatrix {
    return new AffineDOMMatrix(v);
  }

  static fromFloat32Array(v: Float32Array): AffineDOMMatrix {
    return new AffineDOMMatrix(v);
  }

  get m11(): number { return this.a; }
  get m12(): number { return this.b; }
  get m21(): number { return this.c; }
  get m22(): number { return this.d; }
  get m41(): number { return this.e; }
  get m42(): number { return this.f; }
  get m13(): number { return 0; }
  get m14(): number { return 0; }
  get m23(): number { return 0; }
  get m24(): number { return 0; }
  get m31(): number { return 0; }
  get m32(): number { return 0; }
  get m33(): number { return 1; }
  get m34(): number { return 0; }
  get m43(): number { return 0; }
  get m44(): number { return 1; }
  get is2D(): boolean { return true; }
  get isIdentity(): boolean {
    return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
  }

  #set(a: number, b: number, c: number, d: number, e: number, f: number): this {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }

  /** this = this × other */
  multiplySelf(other?: MatrixLike): this {
    const o = new AffineDOMMatrix(other);
    return this.#set(
      this.a * o.a + this.c * o.b,
      this.b * o.a + this.d * o.b,
      this.a * o.c + this.c * o.d,
      this.b * o.c + this.d * o.d,
      this.a * o.e + this.c * o.f + this.e,
      this.b * o.e + this.d * o.f + this.f,
    );
  }

  /** this = other × this */
  preMultiplySelf(other?: MatrixLike): this {
    const o = new AffineDOMMatrix(other);
    return this.#set(
      o.a * this.a + o.c * this.b,
      o.b * this.a + o.d * this.b,
      o.a * this.c + o.c * this.d,
      o.b * this.c + o.d * this.d,
      o.a * this.e + o.c * this.f + o.e,
      o.b * this.e + o.d * this.f + o.f,
    );
  }

  translateSelf(tx = 0, ty = 0): this {
    return this.multiplySelf({ a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
  }

  scaleSelf(sx = 1, sy = sx, _sz = 1, ox = 0, oy = 0): this {
    this.translateSelf(ox, oy);
    this.multiplySelf({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
    return this.translateSelf(-ox, -oy);
  }

  /** A singular matrix becomes all NaN, as the specification requires. */
  invertSelf(): this {
    const det = this.a * this.d - this.b * this.c;
    if (det === 0 || !Number.isFinite(det)) return this.#set(NaN, NaN, NaN, NaN, NaN, NaN);
    return this.#set(
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det,
    );
  }

  multiply(other?: MatrixLike): AffineDOMMatrix {
    return new AffineDOMMatrix(this).multiplySelf(other);
  }

  translate(tx = 0, ty = 0): AffineDOMMatrix {
    return new AffineDOMMatrix(this).translateSelf(tx, ty);
  }

  scale(sx = 1, sy = sx, sz = 1, ox = 0, oy = 0): AffineDOMMatrix {
    return new AffineDOMMatrix(this).scaleSelf(sx, sy, sz, ox, oy);
  }

  inverse(): AffineDOMMatrix {
    return new AffineDOMMatrix(this).invertSelf();
  }

  transformPoint(p: { x?: number; y?: number } = {}): { x: number; y: number; z: number; w: number } {
    const x = p.x ?? 0;
    const y = p.y ?? 0;
    return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f, z: 0, w: 1 };
  }

  toFloat64Array(): Float64Array {
    return Float64Array.from([this.a, this.b, 0, 0, this.c, this.d, 0, 0, 0, 0, 1, 0, this.e, this.f, 0, 1]);
  }

  toFloat32Array(): Float32Array {
    return Float32Array.from(this.toFloat64Array());
  }
}

/**
 * Install where there is none — which, in Node, is always: this runs before pdfjs
 * looks for the native one, so a laptop with `@napi-rs/canvas` and a server without
 * it read an affection plan through the same arithmetic. The intake tests therefore
 * exercise exactly what production runs. A browser's own `DOMMatrix` is untouched.
 */
export function ensureDOMMatrix(): void {
  const g = globalThis as { DOMMatrix?: unknown };
  if (g.DOMMatrix === undefined) g.DOMMatrix = AffineDOMMatrix;
}
