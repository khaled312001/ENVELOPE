/**
 * The global `JSX` namespace, which `@types/react` 19 no longer declares.
 *
 * React 19 moved it to `React.JSX`. Fifty-four files here annotate their
 * components `(): JSX.Element`, and the upgrade's only type error was those 150
 * annotations. This file aliases the old name to the new one — the migration
 * route the React 19 upgrade guide gives — so the upgrade is one file rather
 * than a sweep through every screen in the same commit as a major-version bump.
 *
 * It is an alias and nothing more: every member resolves to React's own
 * declaration, so the two names cannot disagree. New code may use either.
 */

import type { JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    type ElementType = ReactJSX.ElementType;
    interface ElementClass extends ReactJSX.ElementClass {}
    interface ElementAttributesProperty extends ReactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends ReactJSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}
