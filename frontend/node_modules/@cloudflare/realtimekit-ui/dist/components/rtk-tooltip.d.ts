import type { Components, JSX } from "../types/components";

interface RtkTooltip extends Components.RtkTooltip, HTMLElement {}
export const RtkTooltip: {
    prototype: RtkTooltip;
    new (): RtkTooltip;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
