/**
 * @envelope/massing — the building in three dimensions, from the engine's model.
 *
 * The scene the web viewer draws and the .glb the API writes are built by the same
 * call from the same `BuildingModel`, so the file a consultant opens is the view
 * they were shown. Depends on `core`, `sheets` (for where each car stands) and
 * three.js — never on the engine (`pnpm boundaries`).
 */

export * from './scene.js';
export * from './palette.js';
export * from './glb.js';
