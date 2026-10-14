import type { BuildingModel } from '@envelope/core';

import building from '@web/screens/worked-example.building.json';

import { Massing3D } from './Massing3D.js';

/*
  THE WORKED EXAMPLE'S BUILDING, turning. Its own module so the home page loads
  the model with the 3D view that draws it, rather than carrying 36 KB of JSON
  in the entry chunk for a picture that arrives a moment later anyway. It is the
  run's BuildingModel as `scripts/verify-worked-example.mjs` wrote it — the same
  scene the studio shows, not a model made for the page.
*/
const model = building as unknown as BuildingModel;

export function WorkedModel({ onFailed }: { readonly onFailed: () => void }): JSX.Element {
  return <Massing3D model={model} autoRotate onFailed={onFailed} />;
}
