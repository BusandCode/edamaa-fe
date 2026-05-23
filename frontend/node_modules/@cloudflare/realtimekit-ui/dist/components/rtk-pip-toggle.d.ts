import type { Components, JSX } from "../types/components";

interface RtkPipToggle extends Components.RtkPipToggle, HTMLElement {}
export const RtkPipToggle: {
    prototype: RtkPipToggle;
    new (): RtkPipToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
