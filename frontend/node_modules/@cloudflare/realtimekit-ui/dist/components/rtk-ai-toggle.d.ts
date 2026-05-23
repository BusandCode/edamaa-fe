import type { Components, JSX } from "../types/components";

interface RtkAiToggle extends Components.RtkAiToggle, HTMLElement {}
export const RtkAiToggle: {
    prototype: RtkAiToggle;
    new (): RtkAiToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
