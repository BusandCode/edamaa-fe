import type { Components, JSX } from "../types/components";

interface RtkSpotlightGrid extends Components.RtkSpotlightGrid, HTMLElement {}
export const RtkSpotlightGrid: {
    prototype: RtkSpotlightGrid;
    new (): RtkSpotlightGrid;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
