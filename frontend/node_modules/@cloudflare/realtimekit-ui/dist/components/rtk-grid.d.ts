import type { Components, JSX } from "../types/components";

interface RtkGrid extends Components.RtkGrid, HTMLElement {}
export const RtkGrid: {
    prototype: RtkGrid;
    new (): RtkGrid;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
