import type { Components, JSX } from "../types/components";

interface RtkSpotlightIndicator extends Components.RtkSpotlightIndicator, HTMLElement {}
export const RtkSpotlightIndicator: {
    prototype: RtkSpotlightIndicator;
    new (): RtkSpotlightIndicator;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
