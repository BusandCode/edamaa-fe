import type { Components, JSX } from "../types/components";

interface RtkSimpleGrid extends Components.RtkSimpleGrid, HTMLElement {}
export const RtkSimpleGrid: {
    prototype: RtkSimpleGrid;
    new (): RtkSimpleGrid;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
