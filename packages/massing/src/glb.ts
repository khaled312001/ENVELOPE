/**
 * The building as a .glb — the massing view, as a file another program can open.
 *
 * It is the same scene the viewer draws, built by the same call from the same model,
 * with two changes made for the reader at the other end:
 *
 * - **The cars are written out as ordinary meshes, one per level.** three.js would
 *   write them with `EXT_mesh_gpu_instancing`, and it marks that extension
 *   *required* — a viewer that does not implement it must refuse the whole file.
 *   A capacity study that opens in three.js and nowhere else is not an export.
 * - **The file says what it is.** The scene's `extras` carry the two sentences every
 *   drawing carries, what the model does not contain, the units and the plot point
 *   the coordinates are measured from. A .glb has no title block; a reader that
 *   opens it cold still gets told it is not for construction.
 *
 * Metres, Y up, as glTF requires. The origin is the plot's centroid, not the grid's:
 * plot coordinates are UTM, and six-digit metres in single-precision floats would
 * shake a car by a few centimetres.
 */

import type { BuildingModel } from '@envelope/core';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { FILE_PALETTE } from './palette.js';
import { buildBuildingScene, type ScenePalette } from './scene.js';

export const GLB_NOTICE = [
  'NOT FOR CONSTRUCTION. REGULATORY VALIDITY: NOT ASSESSED.',
  'Generated capacity study, not a submission drawing.',
] as const;

export interface GlbMeta {
  readonly plotNumber: string;
  readonly community: string;
  readonly runId: string;
}

export async function buildingGlb(
  model: BuildingModel,
  meta: GlbMeta,
  palette: ScenePalette = FILE_PALETTE,
): Promise<ArrayBuffer> {
  installBytesReader();
  const built = buildBuildingScene(model, palette);
  const scene = new THREE.Scene();
  scene.name = `plot ${meta.plotNumber}, ${meta.community} - run ${meta.runId}`;
  scene.add(built.root);
  scene.userData = {
    notice: [...GLB_NOTICE],
    plot: { number: meta.plotNumber, community: meta.community },
    run: meta.runId,
    units: 'metres, Y up',
    origin: {
      statement: 'Coordinates are measured from this point of the plot, in UTM 40N millimetres.',
      xMm: built.originMm.x,
      yMm: built.originMm.y,
    },
    notModelled: [...model.notModelled],
  };

  const merged: THREE.BufferGeometry[] = [];
  const instanced: THREE.InstancedMesh[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) instanced.push(o);
  });
  for (const mesh of instanced) {
    const parent = mesh.parent;
    if (!parent) continue;
    parent.remove(mesh);
    const geometry = unInstance(mesh);
    if (!geometry) continue;
    merged.push(geometry);
    const flat = new THREE.Mesh(geometry, mesh.material);
    flat.name = mesh.name;
    flat.userData = { ...mesh.userData, carCount: mesh.count };
    parent.add(flat);
  }

  // glTF has one material model for lines and faces alike; a line's colour travels as
  // an unlit base colour, which is what `MeshBasicMaterial` writes.
  const inks: THREE.Material[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Line && o.material instanceof THREE.LineBasicMaterial) {
      const m = new THREE.MeshBasicMaterial({ color: o.material.color, transparent: o.material.transparent, opacity: o.material.opacity });
      inks.push(m);
      o.material = m;
    }
  });

  try {
    const out = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
    if (!(out instanceof ArrayBuffer)) throw new Error('The glTF writer returned JSON where a binary file was asked for.');
    return out;
  } finally {
    for (const g of merged) g.dispose();
    for (const m of inks) m.dispose();
    built.dispose();
  }
}

/*
  three's glTF writer assembles the file through `FileReader`, which every browser
  has and Node does not — and the API writes this file on the server, behind the
  same two gates as the DXF, rather than trusting the browser to have passed them.
  This is the smallest stand-in that lets the real writer run there: it hands over
  the bytes the writer produced and does nothing else. In a browser it is never
  installed.
*/
function installBytesReader(): void {
  const g = globalThis as { FileReader?: unknown };
  if (typeof g.FileReader !== 'undefined') return;
  g.FileReader = class BytesReader {
    result: ArrayBuffer | string | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob): void {
      void blob.arrayBuffer().then((b) => {
        this.result = b;
        this.onloadend?.();
      });
    }
    readAsDataURL(blob: Blob): void {
      void blob.arrayBuffer().then((b) => {
        let binary = '';
        const bytes = new Uint8Array(b);
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        this.result = `data:application/octet-stream;base64,${btoa(binary)}`;
        this.onloadend?.();
      });
    }
  };
}

/**
 * An instanced mesh, written out: every copy placed, and the material groups kept.
 *
 * The car is two groups — body and cabin, inked differently — and merging the placed
 * copies in one pass would throw the groups away and leave a mesh with two materials
 * and nothing saying which triangles use which. So each group is gathered across
 * every copy on its own, and the two runs are joined with one group apiece.
 */
function unInstance(mesh: THREE.InstancedMesh): THREE.BufferGeometry | null {
  const source = mesh.geometry;
  const groups = source.groups.length > 0 ? source.groups : [{ start: 0, count: source.getAttribute('position').count, materialIndex: 0 }];
  const matrix = new THREE.Matrix4();
  const runs: THREE.BufferGeometry[] = [];
  for (const group of groups) {
    const part = slice(source, group.start, group.count);
    const copies: THREE.BufferGeometry[] = [];
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      copies.push(part.clone().applyMatrix4(matrix));
    }
    const run = copies.length > 0 ? mergeGeometries(copies) : null;
    for (const c of copies) c.dispose();
    part.dispose();
    if (run) runs.push(run);
  }
  if (runs.length === 0) return null;
  const joined = mergeGeometries(runs, true);
  for (const r of runs) r.dispose();
  return joined;
}

/** Vertices `start` to `start + count` of a non-indexed geometry, as their own geometry. */
function slice(geometry: THREE.BufferGeometry, start: number, count: number): THREE.BufferGeometry {
  if (geometry.index) throw new Error('A car geometry arrived indexed; the writer expects the extruded, non-indexed one.');
  const out = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const size = attribute.itemSize;
    const array = (attribute.array as Float32Array).slice(start * size, (start + count) * size);
    out.setAttribute(name, new THREE.BufferAttribute(array, size, attribute.normalized));
  }
  return out;
}
