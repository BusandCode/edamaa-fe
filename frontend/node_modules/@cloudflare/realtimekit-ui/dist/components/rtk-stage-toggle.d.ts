import type { Components, JSX } from "../types/components";

interface RtkStageToggle extends Components.RtkStageToggle, HTMLElement {}
export const RtkStageToggle: {
    prototype: RtkStageToggle;
    new (): RtkStageToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
