/**
 * The building in 3D — the engine's model, stood up, and nothing added to it.
 *
 * `@envelope/massing` builds the scene: every level at its own floor, every car in
 * the bay the sheet puts it in, the ramp as a slope between the two levels it joins,
 * the envelope as a glass case to the height ceiling. This file only lets a person
 * look at it, and it is written so that looking costs nothing when nobody is:
 *
 * - **It draws when something changes, not sixty times a second.** A drag, a zoom,
 *   a resize or a control asks for one frame; the damped glide after a drag asks for
 *   the frames it needs and then stops. A laptop on battery on a site visit should
 *   not spend it redrawing a still picture.
 * - **From above is a true plan.** An orthographic camera, grid north up, with a
 *   scale bar — the same view as the level's sheet, so the two can be laid side by
 *   side. Rotation is off in it; a plan that tilts is no longer a plan.
 * - **One level, the levels apart, a horizontal cut.** The three ways into a stack
 *   of floors without inventing a section the engine did not cut.
 * - **A click opens the derivation.** Every object carries the node of the value it
 *   was drawn from, so selecting a car opens how the bays were counted, selecting
 *   the ramp opens its gradient, selecting the glass opens the setback line.
 * - **A keyboard can drive it,** and a screen reader is sent to the table beside it
 *   rather than into a canvas. The table is the equivalent, not a summary.
 *
 * Colours are read from the design tokens at mount and again when the theme
 * changes, so there is no second palette here to drift from the CSS.
 */

import type { BuildingModel } from '@envelope/core';
import {
  type BuildingScene,
  buildBuildingScene,
  carsPerLevel,
  choosePick,
  FILE_PALETTE,
  type SceneLabel,
  type ScenePalette,
} from '@envelope/massing';
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

type View = 'axon' | 'top';

/** How far apart "pull the levels apart" sets them, in metres. A viewing aid; nothing is measured across it. */
const SPREAD_GAP_M = 3;
/** No cut: every material keeps everything below this height. */
const NO_CUT = 1e6;

interface Handle {
  setView(view: View): void;
  isolate(levelId: string | null): void;
  spread(on: boolean): void;
  cut(heightM: number | null): void;
  reset(): void;
  key(key: string, shift: boolean): boolean;
}

/**
 * The palette, from the live tokens. A token that does not resolve falls back to
 * the file palette, which is the light theme's own values and is held to them by
 * `pnpm contrast` — so the fallback is a checked colour, not a guess.
 */
function readPalette(el: HTMLElement): ScenePalette {
  const s = getComputedStyle(el);
  const pick = (name: string, fallback: string): string => s.getPropertyValue(name).trim() || fallback;
  return {
    derived: pick('--derived', FILE_PALETTE.derived),
    assumed: pick('--uncertain', FILE_PALETTE.assumed),
    userSet: pick('--accent', FILE_PALETTE.userSet),
    neutral: pick('--text-secondary', FILE_PALETTE.neutral),
    ground: pick('--surface-sunken', FILE_PALETTE.ground),
    car: pick('--border-strong', FILE_PALETTE.car),
  };
}

export interface BuildingViewerProps {
  readonly model: BuildingModel;
  readonly onInspect: (nodeId: string) => void;
}

export function BuildingViewer({ model, onInspect }: BuildingViewerProps): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleBarRef = useRef<HTMLSpanElement>(null);
  const scaleLabelRef = useRef<HTMLSpanElement>(null);
  const handle = useRef<Handle | null>(null);
  const hintId = useId();

  const [view, setView] = useState<View>('axon');
  const [levelId, setLevelId] = useState<string | null>(null);
  const [spread, setSpread] = useState(false);
  const [cutM, setCutM] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  // The world is rebuilt when the model or the theme changes; the controls below are
  // re-applied to it from here, so a rebuild never resets what the reader chose.
  const chosen = useRef({ view, levelId, spread, cutM });
  chosen.current = { view, levelId, spread, cutM };
  const inspect = useRef(onInspect);
  inspect.current = onInspect;

  const last = model.levels[model.levels.length - 1];
  const topM = last ? (last.elevationMm + last.heightMm) / 1000 : 0;
  const cutMax = Math.max(topM, Number(model.heightCeilingM.value) || 0);

  useEffect(() => {
    const bump = (): void => setThemeKey((k) => k + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', bump);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', bump);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    setFailed(false);
    const host = stage.parentElement ?? stage;

    const built: BuildingScene = buildBuildingScene(model, readPalette(stage));
    const scene = new THREE.Scene();
    scene.add(built.root);
    // What was actually put on the GPU, for `pnpm smoke` to hold against the engine's
    // figure on the same screen. Counted off the scene, not copied from the model.
    host.dataset['cars'] = String([...carsPerLevel(built).values()].reduce((n, m) => n + m.count, 0));

    // --- light: legibility, not realism -------------------------------------------
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a84, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun, sun.target);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.className = 'massing-viewer__canvas';
    // The canvas repeats what the table beside it states. Announced, it would read geometry.
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);

    const words = new CSS2DRenderer();
    words.domElement.className = 'massing-viewer__labels';
    words.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(words.domElement);

    const levelGroup = new Map(built.levels.map(({ level, group }) => [level.id, group]));
    const tags: { tag: CSS2DObject; label: SceneLabel }[] = [];
    for (const l of built.labels) {
      const el = document.createElement('span');
      el.className = `massing-label massing-label--${l.kind}`;
      if (l.provenanceClass === 'ASSUMED') el.dataset['state'] = 'assumed';
      else if (l.provenanceClass === 'DERIVED') el.dataset['state'] = 'derived';
      el.textContent = l.text;
      const tag = new CSS2DObject(el);
      tag.position.set(l.at[0], l.at[1], l.at[2]);
      (l.levelId ? (levelGroup.get(l.levelId) ?? built.root) : built.root).add(tag);
      tags.push({ tag, label: l });
    }

    // --- framing --------------------------------------------------------------------
    built.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(built.root);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 10);

    sun.position.copy(centre).add(new THREE.Vector3(-0.55, 1, 0.75).multiplyScalar(radius * 2));
    sun.target.position.copy(centre);
    const shadow = sun.shadow.camera;
    shadow.left = -radius;
    shadow.right = radius;
    shadow.top = radius;
    shadow.bottom = -radius;
    shadow.near = 0.1;
    shadow.far = radius * 5;
    shadow.updateProjectionMatrix();

    const persp = new THREE.PerspectiveCamera(40, 1, Math.max(radius / 400, 0.1), radius * 20);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, radius * 20);
    // Plot +y is grid north; the scene turns it to -z. Up on screen is north.
    ortho.up.set(0, 0, -1);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orbit = new OrbitControls(persp, canvas);
    orbit.enableDamping = !reduced;
    orbit.screenSpacePanning = true;
    orbit.maxPolarAngle = Math.PI / 2 - 0.02; // never under the ground
    orbit.minDistance = radius * 0.2;
    orbit.maxDistance = radius * 4;
    const plan = new OrbitControls(ortho, canvas);
    plan.enableRotate = false;
    plan.enableDamping = !reduced;
    plan.screenSpacePanning = true;
    plan.minZoom = 0.5;
    plan.maxZoom = 16;
    plan.enabled = false;

    const home = (): void => {
      // A fixed camera — from the south-east, above — so the same run always opens on
      // the same picture, and a screenshot of it can be compared with the last one.
      const from = new THREE.Vector3(1, 0.85, 1.25).normalize();
      // Fitted to whichever of the two angles is narrower: on a phone held upright it
      // is the width, and a fit to the height alone crops the building's sides.
      const vertical = THREE.MathUtils.degToRad(persp.fov);
      const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * persp.aspect);
      const distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 0.92;
      orbit.target.copy(centre);
      persp.position.copy(centre).addScaledVector(from, distance);
      orbit.update();
      plan.target.set(centre.x, 0, centre.z);
      ortho.position.set(centre.x, box.max.y + radius, centre.z);
      ortho.zoom = 1;
      ortho.updateProjectionMatrix();
      plan.update();
    };

    // Panning may wander, but not so far that the building is lost off the edge.
    const reach = radius * 1.5;
    const tether = (controls: OrbitControls, camera: THREE.Camera): void => {
      const t = controls.target;
      const clamped = t.clone().clamp(centre.clone().subScalar(reach), centre.clone().addScalar(reach));
      if (clamped.equals(t)) return;
      camera.position.add(clamped.clone().sub(t));
      t.copy(clamped);
    };

    const fit = (): void => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      words.setSize(w, h);
      persp.aspect = w / h;
      persp.updateProjectionMatrix();
      const aspect = w / h;
      // Room round the plot for the words written outside its edges.
      const halfH = Math.max(size.z / 2 + 8, (size.x / 2 + 8) / aspect);
      ortho.left = -halfH * aspect;
      ortho.right = halfH * aspect;
      ortho.top = halfH;
      ortho.bottom = -halfH;
      ortho.updateProjectionMatrix();
    };

    const scale = (): void => {
      const bar = scaleBarRef.current;
      const label = scaleLabelRef.current;
      if (!bar || !label || stage.clientWidth === 0) return;
      const metresPerPixel = (ortho.right - ortho.left) / ortho.zoom / stage.clientWidth;
      const length = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((n) => n / metresPerPixel >= 56) ?? 500;
      bar.style.inlineSize = `${Math.round(length / metresPerPixel)}px`;
      label.textContent = `${length} m`;
    };

    // --- drawing, on demand ----------------------------------------------------------
    let queued = 0;
    let frames = 0;
    const active = (): { camera: THREE.Camera; controls: OrbitControls } =>
      chosen.current.view === 'top' ? { camera: ortho, controls: plan } : { camera: persp, controls: orbit };
    const draw = (): void => {
      queued = 0;
      const { camera, controls } = active();
      // With damping on, this glides and asks for the next frame itself; it stops
      // asking once the glide has settled.
      controls.update();
      const started = performance.now();
      renderer.render(scene, camera);
      words.render(scene, camera);
      frames += 1;
      host.dataset['frames'] = String(frames);
      host.dataset['frameMs'] = (performance.now() - started).toFixed(1);
      if (chosen.current.view === 'top') scale();
    };
    const request = (): void => {
      if (queued === 0) queued = requestAnimationFrame(draw);
    };
    orbit.addEventListener('change', () => {
      tether(orbit, persp);
      request();
    });
    plan.addEventListener('change', () => {
      tether(plan, ortho);
      request();
    });

    // Which words show: the always-on few in the whole-building view, a level's own
    // name when it is shown alone, nothing the cut has taken away, and no ceiling
    // label on a plan, where it would sit on top of whichever level is shown.
    const syncTags = (): void => {
      built.root.updateMatrixWorld(true);
      const p = new THREE.Vector3();
      const { levelId: only, view: v } = chosen.current;
      for (const { tag, label } of tags) {
        const own = label.kind === 'level' && label.levelId === only;
        const wanted = own || (label.always && (only === null || label.kind !== 'level'));
        const planHides = v === 'top' && label.kind === 'ceiling';
        tag.visible = wanted && !planHides && tag.getWorldPosition(p).y <= built.cut.constant + 0.01;
      }
    };

    // --- selection ---------------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    let pressed: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent): void => {
      pressed = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    };
    const onUp = (e: PointerEvent): void => {
      const from = pressed;
      pressed = null;
      // A drag is a turn, not a selection.
      if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) > 4) return;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, active().camera);
      const hits = raycaster
        .intersectObjects([...built.pickables], false)
        // What the cut has taken away cannot be selected.
        .filter((h) => h.point.y <= built.cut.constant + 1e-3);
      const pick = choosePick(hits);
      if (pick) inspect.current(pick.pick.node);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    handle.current = {
      setView(v) {
        orbit.enabled = v === 'axon';
        plan.enabled = v === 'top';
        built.setPlan(v === 'top');
        host.dataset['view'] = v;
        syncTags();
        request();
      },
      isolate(id) {
        built.isolate(id);
        syncTags();
        request();
      },
      spread(on) {
        built.setSpread(on ? SPREAD_GAP_M : 0);
        syncTags();
        request();
      },
      cut(heightM) {
        built.cut.constant = heightM ?? NO_CUT;
        syncTags();
        request();
      },
      reset() {
        home();
        request();
      },
      key(key, shift) {
        const top = chosen.current.view === 'top';
        const { controls } = active();
        const pan = top || shift;
        const turn = Math.PI / 18;
        switch (key) {
          case 'ArrowLeft':
            if (pan) controls.pan(40, 0);
            else orbit.rotateLeft(turn);
            return true;
          case 'ArrowRight':
            if (pan) controls.pan(-40, 0);
            else orbit.rotateLeft(-turn);
            return true;
          case 'ArrowUp':
            if (pan) controls.pan(0, 40);
            else orbit.rotateUp(turn / 2);
            return true;
          case 'ArrowDown':
            if (pan) controls.pan(0, -40);
            else orbit.rotateUp(-turn / 2);
            return true;
          case '+':
          case '=':
            controls.dollyIn(0.8);
            return true;
          case '-':
          case '_':
            controls.dollyOut(0.8);
            return true;
          case 'Home':
            home();
            request();
            return true;
          default:
            return false;
        }
      },
    };

    fit();
    home();
    const now = chosen.current;
    handle.current.setView(now.view);
    handle.current.isolate(now.levelId);
    handle.current.spread(now.spread);
    handle.current.cut(now.cutM);
    const observer = new ResizeObserver(() => {
      fit();
      request();
    });
    observer.observe(stage);

    return () => {
      handle.current = null;
      if (queued) cancelAnimationFrame(queued);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      orbit.dispose();
      plan.dispose();
      built.dispose();
      renderer.dispose();
      stage.removeChild(canvas);
      stage.removeChild(words.domElement);
    };
  }, [model, themeKey]);

  useEffect(() => handle.current?.setView(view), [view]);
  useEffect(() => handle.current?.isolate(levelId), [levelId]);
  useEffect(() => handle.current?.spread(spread), [spread]);
  useEffect(() => handle.current?.cut(cutM), [cutM]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (handle.current?.key(e.key, e.shiftKey)) e.preventDefault();
  };

  const cutLabel = cutM === null ? 'no cut' : `+${cutM.toFixed(1)} m`;

  return (
    <div className="massing">
      <div className="massing-tools">
        <div className="segmented" role="group" aria-label="View">
          <button type="button" className="segmented__option" aria-pressed={view === 'axon'} onClick={() => setView('axon')}>
            3D
          </button>
          <button type="button" className="segmented__option" aria-pressed={view === 'top'} onClick={() => setView('top')}>
            From above
          </button>
        </div>
        <label className="massing-tools__field">
          <span>Show</span>
          <select className="input" value={levelId ?? ''} onChange={(e) => setLevelId(e.target.value === '' ? null : e.target.value)}>
            <option value="">Every level</option>
            {model.levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} · {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={spread} onChange={(e) => setSpread(e.target.checked)} />
          Pull the levels apart
        </label>
        <label className="massing-tools__field massing-tools__cut">
          <span>Cut through at</span>
          <input
            type="range"
            min={0}
            max={cutMax}
            step={0.1}
            value={cutM ?? cutMax}
            aria-valuetext={cutLabel}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCutM(v >= topM ? null : v);
            }}
          />
          <output aria-hidden="true">{cutLabel}</output>
        </label>
        <button
          type="button"
          className="link-button"
          onClick={() => handle.current?.reset()}
        >
          Reset the view
        </button>
      </div>

      <div
        className="massing-viewer"
        tabIndex={0}
        role="group"
        aria-roledescription="3D view"
        aria-label="The building in 3D. Every level in it is listed in the table below."
        aria-describedby={hintId}
        data-view={view}
        onKeyDown={onKeyDown}
      >
        <div ref={stageRef} className="massing-viewer__stage" />
        {view === 'top' ? (
          <>
            <span className="massing-viewer__north" aria-hidden="true">
              ↑ Grid north
            </span>
            <span className="massing-viewer__scale" aria-hidden="true">
              <span ref={scaleBarRef} className="massing-viewer__scale-bar" />
              <span ref={scaleLabelRef} />
            </span>
          </>
        ) : null}
        {failed ? (
          <p className="massing-viewer__failed">
            This browser could not start 3D drawing — WebGL is switched off or unavailable.
            Every level is listed in the table below, and each parking level is drawn on the
            Parking step.
          </p>
        ) : null}
      </div>
      <p id={hintId} className="fine-print">
        Drag to turn it and scroll to zoom — or, once it has focus, use the arrow keys (Shift
        to pan), + and − to zoom and Home to start again. Select a car, a slab, the ramp or the
        envelope to see where it came from.
      </p>
    </div>
  );
}
