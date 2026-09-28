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
 *
 * **As a figure on a page** (`variant="figure"`) it is still until the reader asks to
 * turn it. Until then the wheel and the finger belong to the page: a model that
 * catches the scroll of someone reading past it has taken the page from them. It
 * has no tools but that and a reset, nothing in it is selectable unless the page
 * can show a derivation, and where WebGL is missing the page's own drawing stands
 * in its place.
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
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { useDict } from '../i18n/locale.js';
import { AR } from '../i18n/viewer.ar.js';
import { EN, type ViewerDictionary } from '../i18n/viewer.en.js';

type View = 'axon' | 'top';

/** How far apart "pull the levels apart" sets them, in metres. A viewing aid; nothing is measured across it. */
const SPREAD_GAP_M = 3;
/** No cut: every material keeps everything below this height. */
const NO_CUT = 1e6;
/** The view's name wherever a sentence says it — a constant, so not a word in a dictionary. */
const VIEW = '3D';

/**
 * THE WORDS BESIDE THE MODEL, IN THE PAGE'S LANGUAGE — AND NOTHING ELSE CHANGED.
 *
 * `@envelope/massing` composes each label round the model's own level name, id and
 * figure, and adds a few words of its own: "permitted, not placed", "gradient not
 * assessed", "Height ceiling", "setback". Those words are looked up here by their
 * exact English (`EN.scene`, which IS the package's wording) and replaced with the
 * active locale's; everything round them is left as the model states it. In English
 * this returns the label untouched. If the package ever rewords a phrase, the
 * lookup misses and the label shows the package's English — a word in the wrong
 * language, never a figure in the wrong place.
 */
function sceneText(label: SceneLabel, words: ViewerDictionary['scene']): string {
  const en = EN.scene;
  const { text } = label;
  if (words === en) return text;
  const suffix = (phrase: string, next: string): string =>
    text.endsWith(` · ${phrase}`) ? text.slice(0, text.length - phrase.length) + next : text;
  switch (label.kind) {
    case 'level':
      return suffix(en.permittedNotPlaced, words.permittedNotPlaced);
    case 'ramp':
      return suffix(en.gradientNotAssessed, words.gradientNotAssessed);
    case 'ceiling':
      return text.startsWith(`${en.heightCeiling} `)
        ? words.heightCeiling + text.slice(en.heightCeiling.length)
        : text;
    case 'edge':
      return text.replace(` · ${en.setback} `, ` · ${words.setback} `);
    default:
      return text;
  }
}

interface Handle {
  setView(view: View): void;
  isolate(levelId: string | null): void;
  spread(on: boolean): void;
  cut(heightM: number | null): void;
  live(on: boolean): void;
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

function isInside(o: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === ancestor) return true;
  return false;
}

export interface BuildingViewerProps {
  readonly model: BuildingModel;
  /** Opens a value's derivation. Without it nothing in the model is selectable. */
  readonly onInspect?: (nodeId: string) => void;
  /** `figure`: still until the reader chooses to turn it, with no tools but that. */
  readonly variant?: 'full' | 'figure';
  /**
   * One level alone, framed to itself and to the plot, without the envelope's glass:
   * a parking level is lost at the foot of a case drawn to the height ceiling.
   */
  readonly focusLevelId?: string;
  /**
   * The model's accessible name. It says where the same content is in words.
   * Without one, the viewer names itself in the page's language.
   */
  readonly label?: string;
  /** Drawn in the canvas's place where WebGL is unavailable. */
  readonly fallback?: ReactNode;
}

export function BuildingViewer({
  model,
  onInspect,
  variant = 'full',
  focusLevelId,
  label,
  fallback,
}: BuildingViewerProps): JSX.Element {
  const t = useDict(EN, AR);
  const name = label ?? t.label(VIEW);
  const figure = variant === 'figure';
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleBarRef = useRef<HTMLSpanElement>(null);
  const scaleLabelRef = useRef<HTMLSpanElement>(null);
  const handle = useRef<Handle | null>(null);
  const hintId = useId();

  const [view, setView] = useState<View>('axon');
  const [levelId, setLevelId] = useState<string | null>(focusLevelId ?? null);
  const [live, setLive] = useState(!figure);
  const [spread, setSpread] = useState(false);
  const [cutM, setCutM] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  // The world is rebuilt when the model or the theme changes; the controls below are
  // re-applied to it from here, so a rebuild never resets what the reader chose.
  const chosen = useRef({ view, levelId, spread, cutM, live });
  chosen.current = { view, levelId, spread, cutM, live };
  const inspect = useRef(onInspect);
  inspect.current = onInspect;
  // The words beside the model follow the page's language without rebuilding the
  // scene: the labels are kept, and their text is set again when the locale changes.
  const sceneWords = useRef(t.scene);
  sceneWords.current = t.scene;
  const labels = useRef<{ el: HTMLElement; label: SceneLabel }[]>([]);

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
      el.textContent = sceneText(l, sceneWords.current);
      labels.current.push({ el, label: l });
      const tag = new CSS2DObject(el);
      tag.position.set(l.at[0], l.at[1], l.at[2]);
      (l.levelId ? (levelGroup.get(l.levelId) ?? built.root) : built.root).add(tag);
      tags.push({ tag, label: l });
    }

    // --- framing --------------------------------------------------------------------
    built.root.updateMatrixWorld(true);
    // Focused on one level, the frame is that level and the plot it stands on, and the
    // glass goes: it runs to the height ceiling, and framed with it a parking level is
    // a strip at the foot of the picture.
    const focusGroup = focusLevelId ? levelGroup.get(focusLevelId) : undefined;
    const envelopeGroup = built.root.getObjectByName('envelope');
    if (focusGroup && envelopeGroup) envelopeGroup.visible = false;
    const siteGroup = built.root.getObjectByName('site');
    const box =
      focusGroup && siteGroup
        ? new THREE.Box3().setFromObject(focusGroup).union(new THREE.Box3().setFromObject(siteGroup))
        : new THREE.Box3().setFromObject(built.root);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 10);
    // Every vertex the figure frames, in world space. Cars are left out: each is inside
    // its level's slab, and one level holds hundreds.
    const silhouette: THREE.Vector3[] = [];
    if (figure) {
      for (const framed of focusGroup && siteGroup ? [focusGroup, siteGroup] : [built.root]) {
        framed.traverse((o) => {
          if (o instanceof THREE.InstancedMesh || !(o instanceof THREE.Mesh || o instanceof THREE.Line)) return;
          if (focusGroup && envelopeGroup && isInside(o, envelopeGroup)) return;
          const position = o.geometry.getAttribute('position');
          for (let i = 0; i < position.count; i += 1) {
            silhouette.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld));
          }
        });
      }
    }

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
      // One level alone is looked down on more steeply, so its rows of bays read as rows.
      const from = (focusGroup ? new THREE.Vector3(0.9, 1.6, 1.25) : new THREE.Vector3(1, 0.85, 1.25)).normalize();
      // Fitted to whichever of the two angles is narrower: on a phone held upright it
      // is the width, and a fit to the height alone crops the building's sides.
      const vertical = THREE.MathUtils.degToRad(persp.fov);
      const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * persp.aspect);
      let distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 0.92;
      orbit.target.copy(centre);
      persp.position.copy(centre).addScaledVector(from, distance);
      if (figure) {
        // A figure has no tools to zoom with until the reader turns it on, so it is
        // fitted to what is drawn — every vertex, projected — rather than to a sphere
        // round the box, which leaves two thirds of a plate empty round a tall stack.
        const target = centre.clone();
        for (let pass = 0; pass < 4; pass += 1) {
          persp.position.copy(target).addScaledVector(from, distance);
          persp.lookAt(target);
          persp.updateMatrixWorld(true);
          let x0 = Infinity;
          let x1 = -Infinity;
          let y0 = Infinity;
          let y1 = -Infinity;
          const p = new THREE.Vector3();
          for (const v of silhouette) {
            p.copy(v).project(persp);
            x0 = Math.min(x0, p.x);
            x1 = Math.max(x1, p.x);
            y0 = Math.min(y0, p.y);
            y1 = Math.max(y1, p.y);
          }
          // Centre what is drawn, then size it to 86% of the plate's narrower span.
          const depth = target.clone().project(persp).z;
          target.copy(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, depth).unproject(persp));
          distance *= Math.max(x1 - x0, y1 - y0) / 2 / 0.86;
        }
        orbit.target.copy(target);
        persp.position.copy(target).addScaledVector(from, distance);
      }
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
    // The figure names the bottom of the stack and the top of the answer — the two
    // ends of what the answer places — and leaves the levels between to the caption.
    const lowestId = model.levels[0]?.id;
    const answerTopId = [...model.levels].reverse().find((l) => l.placed !== false)?.id;
    const syncTags = (): void => {
      built.root.updateMatrixWorld(true);
      const p = new THREE.Vector3();
      const { levelId: only, view: v } = chosen.current;
      for (const { tag, label: word } of tags) {
        const own = word.kind === 'level' && word.levelId === only;
        // A figure is small and still, so it names less: its levels and the ceiling,
        // or — shown one level alone — that level and the plot round it. The rest is
        // in the caption beside it.
        const figureAllows =
          !figure ||
          (focusGroup
            ? word.kind !== 'ceiling'
            : word.kind === 'ceiling' || (word.kind === 'level' && (word.levelId === lowestId || word.levelId === answerTopId)));
        const wanted = figureAllows && (own || (word.always && (only === null || word.kind !== 'level')));
        const hidden = (v === 'top' || envelopeGroup?.visible === false) && word.kind === 'ceiling';
        tag.visible = wanted && !hidden && tag.getWorldPosition(p).y <= built.cut.constant + 0.01;
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
      if (pick) inspect.current?.(pick.pick.node);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    // Still, the canvas gives the wheel and the finger back to the page. OrbitControls
    // ignores both while disabled but sets `touch-action: none` when it connects, so
    // that is undone here too — or a phone could not scroll past the figure.
    const applyLive = (): void => {
      const { live: on, view: v } = chosen.current;
      orbit.enabled = on && v === 'axon';
      plan.enabled = on && v === 'top';
      canvas.style.touchAction = on ? 'none' : 'auto';
      host.dataset['live'] = String(on);
    };

    handle.current = {
      setView(v) {
        applyLive();
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
        // The scene shows the glass again whenever the levels close up; a focused
        // figure keeps it hidden.
        if (focusGroup && envelopeGroup) envelopeGroup.visible = false;
        syncTags();
        request();
      },
      cut(heightM) {
        built.cut.constant = heightM ?? NO_CUT;
        syncTags();
        request();
      },
      live() {
        applyLive();
      },
      reset() {
        home();
        request();
      },
      key(key, shift) {
        if (!chosen.current.live) return false;
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
    handle.current.live(now.live);
    const observer = new ResizeObserver(() => {
      fit();
      request();
    });
    observer.observe(stage);

    return () => {
      handle.current = null;
      labels.current = [];
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
  }, [model, themeKey, focusLevelId]);

  useEffect(() => handle.current?.setView(view), [view]);
  useEffect(() => handle.current?.isolate(levelId), [levelId]);
  useEffect(() => handle.current?.spread(spread), [spread]);
  useEffect(() => handle.current?.cut(cutM), [cutM]);
  useEffect(() => handle.current?.live(live), [live]);
  useEffect(() => {
    for (const { el, label: l } of labels.current) el.textContent = sceneText(l, t.scene);
  }, [t.scene]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (handle.current?.key(e.key, e.shiftKey)) e.preventDefault();
  };

  const cutLabel = cutM === null ? t.noCut : `+${cutM.toFixed(1)} m`;

  const tools = figure ? (
    <div className="massing-tools">
      <label className="toggle">
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
        {t.turnOn}
      </label>
      {live ? (
        <button type="button" className="link-button" onClick={() => handle.current?.reset()}>
          {t.reset}
        </button>
      ) : null}
    </div>
  ) : (
    <div className="massing-tools">
      <div className="segmented" role="group" aria-label={t.viewGroup}>
        <button type="button" className="segmented__option" aria-pressed={view === 'axon'} onClick={() => setView('axon')}>
          {t.axon(VIEW)}
        </button>
        <button type="button" className="segmented__option" aria-pressed={view === 'top'} onClick={() => setView('top')}>
          {t.top}
        </button>
      </div>
      <label className="massing-tools__field">
        <span>{t.show}</span>
        <select className="input" value={levelId ?? ''} onChange={(e) => setLevelId(e.target.value === '' ? null : e.target.value)}>
          <option value="">{t.everyLevel}</option>
          {model.levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id} · {l.name}
              {l.placed === false ? t.notPlaced : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={spread} onChange={(e) => setSpread(e.target.checked)} />
        {t.spread}
      </label>
      <label className="massing-tools__field massing-tools__cut">
        <span>{t.cutAt}</span>
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
        {t.reset}
      </button>
    </div>
  );

  // What the pointer does, said once. Selection is only promised where it opens something.
  const hint = figure
    ? live
      ? t.hint.figureLive
      : t.hint.figureStill
    : t.hint.full + (onInspect ? t.hint.select : '');

  return (
    <div className={`massing${figure ? ' massing--figure' : ''}`} data-focus={focusLevelId ? 'level' : undefined}>
      {/*
        A FIGURE'S CONTROL SITS UNDER THE PICTURE, BESIDE THE SENTENCE THAT
        EXPLAINS IT. The full viewer's tools stay above, where a toolbar belongs.

        As a figure it was one checkbox alone on a row above the model, and the
        sentence that says what it is for — "it stays still until you turn it on, so
        scrolling over it moves the page" — was four hundred pixels below it under
        the picture. A lone control with its explanation out of sight is the thing
        `ux-writing` asks for and this did not have. It also cost the model a whole
        row of the plate on the busiest screen on the site.

        IT MOVED IN THE DOCUMENT, NOT IN A STYLESHEET. `order` would have put the
        control after the picture on screen and left it before it for a keyboard and
        a screen reader, which is 1.3.2 and 2.4.3 traded for a layout — on a control
        whose entire job is to tell a reader what the picture will do next.
      */}
      {figure ? null : tools}

      <div
        className="massing-viewer"
        tabIndex={live ? 0 : undefined}
        role="group"
        aria-roledescription={t.roleDescription(VIEW)}
        aria-label={name}
        aria-describedby={hintId}
        data-view={view}
        onKeyDown={onKeyDown}
      >
        <div ref={stageRef} className="massing-viewer__stage" />
        {view === 'top' ? (
          <>
            <span className="massing-viewer__north" aria-hidden="true">
              {t.north}
            </span>
            <span className="massing-viewer__scale" aria-hidden="true">
              <span ref={scaleBarRef} className="massing-viewer__scale-bar" />
              <span ref={scaleLabelRef} />
            </span>
          </>
        ) : null}
        {failed
          ? (fallback ?? (
              <p className="massing-viewer__failed">{t.failed(VIEW)}</p>
            ))
          : null}
      </div>
      {figure ? (
        <div className="massing-figure__foot">
          <p id={hintId} className="fine-print">
            {hint}
          </p>
          {tools}
        </div>
      ) : (
        <p id={hintId} className="fine-print">
          {hint}
        </p>
      )}
    </div>
  );
}
