import type { Components, JSX } from "../types/components";

interface RtkFullscreenToggle extends Components.RtkFullscreenToggle, HTMLElement {}
export const RtkFullscreenToggle: {
    prototype: RtkFullscreenToggle;
    new (): RtkFullscreenToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
