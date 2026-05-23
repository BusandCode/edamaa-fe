import type { Components, JSX } from "../types/components";

interface RtkCameraToggle extends Components.RtkCameraToggle, HTMLElement {}
export const RtkCameraToggle: {
    prototype: RtkCameraToggle;
    new (): RtkCameraToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
