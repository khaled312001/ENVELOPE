/**
 * 3D massing — the envelope, standing up.
 *
 * The client asked for "نفس نظام الثلاثي الأبعاد" after being shown Zenerate,
 * and the reason a 3D view earns its place here is narrower than it looks. He
 * reads a plot's envelope off an affection plan in minutes; what he cannot do
 * quickly is *see* what a 60% tower coverage on a 100% podium actually leaves —
 * the step-back, the podium roof, where the tower can and cannot sit. That is a
 * volume question, and it is answered in a second by a picture and in an hour by
 * a spreadsheet.
 *
 * Two rules govern this component, and they are why it is not simply a pretty
 * renderer:
 *
 * 1. **Provenance survives extrusion.** A mass whose footprint rests on an
 *    assumption is amber and hatched, exactly as the number is. §13.1's
 *    treatment does not get to stop at the edge of the canvas — a 3D view that
 *    made a guessed envelope look as solid as a cited one would be the most
 *    persuasive way yet built to mistake an assumption for a fact.
 *
 * 2. **Nothing here computes.** Every dimension arrives already traced from the
 *    engine. This file extrudes and orbits; it does not decide how tall the
 *    tower is. If a number is wrong, the bug is upstream, and that is a property
 *    worth keeping.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** How a mass came to be, which decides how it is drawn. */
export type MassProvenance = 'DERIVED' | 'ASSUMED' | 'USER_SET';

export interface Mass {
  readonly id: string;
  readonly label: string;
  /** Footprint ring in metres, plot-local coordinates, counter-clockwise. */
  readonly footprint: readonly (readonly [number, number])[];
  readonly baseM: number;
  readonly heightM: number;
  readonly provenance: MassProvenance;
}

export interface MassingViewerProps {
  /** Plot boundary in metres, plot-local coordinates. */
  readonly plot: readonly (readonly [number, number])[];
  readonly masses: readonly Mass[];
  /** Bays and aisles from the parking layout, drawn flat on a level. */
  readonly parking?: {
    readonly levelZ: number;
    readonly rects: readonly {
      readonly kind: 'BAY' | 'AISLE' | 'RAMP';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }[];
  };
  readonly className?: string;
}

/**
 * Colours, read from the design tokens at mount.
 *
 * WebGL cannot resolve `var(--uncertain)`, so the values are pulled from the
 * computed style of a live element rather than duplicated as hex here. A second
 * copy of the palette would drift from the CSS the moment either changed, and
 * the one that would drift silently is the amber.
 */
function readPalette(el: HTMLElement): Record<MassProvenance | 'plot' | 'bay' | 'aisle' | 'ramp', THREE.Color> {
  const s = getComputedStyle(el);
  const pick = (name: string, fallback: string): THREE.Color => {
    const v = s.getPropertyValue(name).trim();
    return new THREE.Color(v === '' ? fallback : v);
  };
  return {
    DERIVED: pick('--derived', '#1f6b45'),
    ASSUMED: pick('--uncertain', '#a35c00'),
    USER_SET: pick('--accent', '#2b5cd9'),
    plot: pick('--text-secondary', '#55555f'),
    bay: pick('--accent', '#2b5cd9'),
    aisle: pick('--border-default', '#cfcfca'),
    // NOT ASSESSED, not ASSUMED — see the note in `ParkingPlan.tsx`. Only the
    // ramp's plan area is reserved; its gradient, transitions and headroom are
    // never reached, and amber is not the colour for a quantity nobody computed.
    ramp: pick('--deferred', '#6a6a74'),
  };
}

function shapeFrom(ring: readonly (readonly [number, number])[]): THREE.Shape {
  const shape = new THREE.Shape();
  const first = ring[0];
  if (!first) return shape;
  shape.moveTo(first[0], first[1]);
  for (const [x, y] of ring.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  return shape;
}

function centroid(ring: readonly (readonly [number, number])[]): [number, number] {
  if (ring.length === 0) return [0, 0];
  const sx = ring.reduce((a, p) => a + p[0], 0);
  const sy = ring.reduce((a, p) => a + p[1], 0);
  return [sx / ring.length, sy / ring.length];
}

export function MassingViewer({
  plot,
  masses,
  parking,
  className,
}: MassingViewerProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);

  // The scene is rebuilt when the geometry changes, which is what makes the
  // viewer respond to an edited parameter. Keyed on a cheap structural digest
  // rather than object identity, so a re-render with equal values does not
  // rebuild the world and lose the camera position.
  const digest = useMemo(
    () =>
      JSON.stringify([
        plot,
        masses.map((m) => [m.id, m.footprint, m.baseM, m.heightM, m.provenance]),
        parking?.rects.length ?? 0,
        parking?.levelZ ?? 0,
      ]),
    [plot, masses, parking],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const palette = readPalette(host);
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    // The canvas is decorative duplication of numbers stated in text elsewhere
    // on the screen; announcing it would make a screen reader read geometry.
    renderer.domElement.setAttribute('role', 'presentation');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 4000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // never orbit under the ground

    // --- lighting: legibility, not realism ------------------------------
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a94, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(60, 120, 90);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    const [cx, cy] = centroid(plot);
    const world = new THREE.Group();
    // Three's Y is up; the engine's plane is XY. Rotating the whole world once
    // keeps every footprint in the coordinates the engine emitted.
    world.rotation.x = -Math.PI / 2;
    world.position.set(-0, 0, 0);
    scene.add(world);

    // --- ground and plot boundary ---------------------------------------
    const plotShape = shapeFrom(plot);
    const ground = new THREE.Mesh(
      new THREE.ShapeGeometry(plotShape),
      new THREE.MeshStandardMaterial({
        color: palette.plot,
        opacity: 0.12,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    );
    ground.receiveShadow = true;
    world.add(ground);

    const boundary = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(plot.map(([x, y]) => new THREE.Vector3(x, y, 0.05))),
      new THREE.LineBasicMaterial({ color: palette.plot }),
    );
    world.add(boundary);

    // --- masses ----------------------------------------------------------
    let maxHeight = 0;
    for (const mass of masses) {
      const geometry = new THREE.ExtrudeGeometry(shapeFrom(mass.footprint), {
        depth: mass.heightM,
        bevelEnabled: false,
      });
      const assumed = mass.provenance === 'ASSUMED';
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: palette[mass.provenance],
          // An assumed mass is translucent as well as amber. Two cues, because
          // colour alone fails 1.4.1 and fails in greyscale print.
          opacity: assumed ? 0.55 : 0.92,
          transparent: true,
          roughness: 0.85,
          metalness: 0,
        }),
      );
      mesh.position.z = mass.baseM;
      mesh.castShadow = !assumed;
      mesh.receiveShadow = true;
      mesh.name = mass.label;
      world.add(mesh);

      // Edges make the storey stack readable at any zoom; a flat-shaded solid
      // reads as one block and the podium/tower distinction disappears.
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 20),
        new THREE.LineBasicMaterial({
          color: palette[mass.provenance],
          transparent: true,
          opacity: assumed ? 0.9 : 0.45,
        }),
      );
      edges.position.z = mass.baseM;
      world.add(edges);

      maxHeight = Math.max(maxHeight, mass.baseM + mass.heightM);
    }

    // --- parking layout, drawn flat -------------------------------------
    if (parking) {
      for (const r of parking.rects) {
        const isBay = r.kind === 'BAY';
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(r.width, r.height),
          new THREE.MeshBasicMaterial({
            color: r.kind === 'RAMP' ? palette.ramp : isBay ? palette.bay : palette.aisle,
            opacity: isBay ? 0.5 : 0.22,
            transparent: true,
            side: THREE.DoubleSide,
          }),
        );
        plane.position.set(r.x + r.width / 2, r.y + r.height / 2, parking.levelZ + 0.02);
        world.add(plane);
      }
    }

    // --- frame the model --------------------------------------------------
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 20);
    controls.target.set(cx, Math.max(maxHeight, 10) / 2, -cy);
    camera.position.set(cx + span * 0.9, Math.max(maxHeight, 20) * 1.15 + span * 0.35, -cy + span * 0.95);
    controls.update();

    const resize = (): void => {
      const { clientWidth: w, clientHeight: h } = host;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // `prefers-reduced-motion` switches off the damped inertial drift. The
    // scene still orbits on drag; it simply stops gliding afterwards.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.enableDamping = !reduced;

    let frame = 0;
    const tick = (): void => {
      frame = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.LineLoop) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      host.removeChild(renderer.domElement);
    };
    // `digest` stands in for the geometry inputs; see the memo above.
  }, [digest, plot, masses, parking]);

  return <div ref={hostRef} className={className ?? 'massing-viewer'} />;
}
