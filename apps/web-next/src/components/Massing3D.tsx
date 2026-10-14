import type { BuildingModel } from '@envelope/core';
import { type BuildingScene, buildBuildingScene, choosePick, FILE_PALETTE, type ScenePalette } from '@envelope/massing';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { cn } from '../lib/cn.js';
import { useTheme } from '../lib/theme.js';

/*
  THE BUILDING, AS THE ENGINE BUILT IT.

  `@envelope/massing` composes the scene from the run's BuildingModel — every
  level at its floor, every car in its bay, the ramp as a slope, the envelope as
  glass — and this component only lights it, frames it and lets it be turned. It
  adds no object of its own, so nothing on this canvas is a building nobody
  computed. A click on an element opens the derivation of the value it names.

  The canvas is `aria-hidden`: the levels table beside it on every screen that
  shows it is the same content in words.
*/

function readPalette(el: HTMLElement): ScenePalette {
  const s = getComputedStyle(el);
  const pick = (name: string, fallback: string): string => s.getPropertyValue(name).trim() || fallback;
  return {
    derived: pick('--derived', FILE_PALETTE.derived),
    assumed: pick('--uncertain', FILE_PALETTE.assumed),
    userSet: pick('--accent', FILE_PALETTE.userSet),
    neutral: pick('--text-secondary', FILE_PALETTE.neutral),
    ground: pick('--surface-raised', FILE_PALETTE.ground),
    car: pick('--border-strong', FILE_PALETTE.car),
  };
}

export interface MassingControls {
  /** One level alone, or the whole building. */
  readonly levelId: string | null;
  /** Metres between levels, to read the stack apart. */
  readonly spread: number;
  readonly envelope: boolean;
}

export function Massing3D({
  model,
  onInspect,
  controls = { levelId: null, spread: 0, envelope: true },
  autoRotate = false,
  className,
  onFailed,
}: {
  readonly model: BuildingModel;
  readonly onInspect?: (nodeId: string) => void;
  readonly controls?: MassingControls;
  /** A slow turn for a hero picture; never when the reader asked for less motion. */
  readonly autoRotate?: boolean;
  readonly className?: string;
  readonly onFailed?: () => void;
}): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ built: BuildingScene; envelope: THREE.Object3D | undefined } | null>(null);
  const inspect = useRef(onInspect);
  inspect.current = onInspect;
  const failed = useRef(onFailed);
  failed.current = onFailed;
  const [ready, setReady] = useState(false);
  // The scene's inks are read off the theme's tokens, so a new theme is a new scene.
  const { theme } = useTheme();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      failed.current?.();
      return;
    }

    const built = buildBuildingScene(model, readPalette(stage));
    const scene = new THREE.Scene();
    scene.add(built.root);
    scene.add(new THREE.HemisphereLight(0xdfe6ff, theme === 'dark' ? 0x1a1f29 : 0x9aa3b5, theme === 'dark' ? 1.25 : 1.45));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
    const rim = new THREE.DirectionalLight(0x9dbcff, 0.6);
    scene.add(sun, sun.target, rim, rim.target);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'block h-full w-full outline-none';
    stage.appendChild(canvas);

    built.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(built.root);
    const centre = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 10);
    sun.position.copy(centre).add(new THREE.Vector3(-0.55, 1, 0.75).multiplyScalar(radius * 2));
    sun.target.position.copy(centre);
    rim.position.copy(centre).add(new THREE.Vector3(0.8, 0.5, -0.9).multiplyScalar(radius * 2));
    rim.target.position.copy(centre);
    const sc = sun.shadow.camera;
    sc.left = -radius;
    sc.right = radius;
    sc.top = radius;
    sc.bottom = -radius;
    sc.near = 0.1;
    sc.far = radius * 5;
    sc.updateProjectionMatrix();

    const camera = new THREE.PerspectiveCamera(38, 1, Math.max(radius / 400, 0.1), radius * 20);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orbit = new OrbitControls(camera, canvas);
    orbit.enableDamping = !reduced;
    orbit.screenSpacePanning = true;
    orbit.maxPolarAngle = Math.PI / 2 - 0.02;
    orbit.minDistance = radius * 0.2;
    orbit.maxDistance = radius * 4;
    orbit.autoRotate = autoRotate && !reduced;
    orbit.autoRotateSpeed = 0.6;

    const home = (): void => {
      const from = new THREE.Vector3(1, 0.8, 1.25).normalize();
      const v = THREE.MathUtils.degToRad(camera.fov);
      const h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
      const distance = (radius / Math.sin(Math.min(v, h) / 2)) * 0.82;
      orbit.target.copy(centre);
      camera.position.copy(centre).addScaledVector(from, distance);
      orbit.update();
    };

    const fit = (): void => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const raycaster = new THREE.Raycaster();
    let pressed: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent): void => {
      pressed = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    };
    const onUp = (e: PointerEvent): void => {
      const from = pressed;
      pressed = null;
      if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) > 4 || !inspect.current) return;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const pick = choosePick(raycaster.intersectObjects([...built.pickables], false));
      if (pick) inspect.current(pick.pick.node);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    io.observe(stage);
    renderer.setAnimationLoop(() => {
      if (!visible || document.hidden) return;
      orbit.update();
      renderer.render(scene, camera);
    });

    fit();
    home();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    sceneRef.current = { built, envelope: built.root.getObjectByName('envelope') };
    setReady(true);

    return () => {
      sceneRef.current = null;
      setReady(false);
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      orbit.dispose();
      built.dispose();
      renderer.dispose();
      stage.removeChild(canvas);
    };
  }, [model, autoRotate, theme]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !ready) return;
    s.built.isolate(controls.levelId);
    s.built.setSpread(controls.spread);
    if (s.envelope) s.envelope.visible = controls.envelope && controls.levelId === null;
  }, [controls.levelId, controls.spread, controls.envelope, ready]);

  return <div ref={stageRef} className={cn('relative h-full w-full', className)} />;
}
