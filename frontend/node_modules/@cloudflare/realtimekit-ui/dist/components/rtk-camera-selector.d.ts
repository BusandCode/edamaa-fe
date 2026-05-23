import type { Components, JSX } from "../types/components";

interface RtkCameraSelector extends Components.RtkCameraSelector, HTMLElement {}
export const RtkCameraSelector: {
    prototype: RtkCameraSelector;
    new (): RtkCameraSelector;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
