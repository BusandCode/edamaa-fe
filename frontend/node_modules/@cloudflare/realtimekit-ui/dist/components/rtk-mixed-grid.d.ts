import type { Components, JSX } from "../types/components";

interface RtkMixedGrid extends Components.RtkMixedGrid, HTMLElement {}
export const RtkMixedGrid: {
    prototype: RtkMixedGrid;
    new (): RtkMixedGrid;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
