import type { Components, JSX } from "../types/components";

interface RtkMicToggle extends Components.RtkMicToggle, HTMLElement {}
export const RtkMicToggle: {
    prototype: RtkMicToggle;
    new (): RtkMicToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
