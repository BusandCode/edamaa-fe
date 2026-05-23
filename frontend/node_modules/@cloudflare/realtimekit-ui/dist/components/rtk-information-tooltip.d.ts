import type { Components, JSX } from "../types/components";

interface RtkInformationTooltip extends Components.RtkInformationTooltip, HTMLElement {}
export const RtkInformationTooltip: {
    prototype: RtkInformationTooltip;
    new (): RtkInformationTooltip;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
