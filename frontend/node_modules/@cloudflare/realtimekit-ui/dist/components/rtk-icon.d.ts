import type { Components, JSX } from "../types/components";

interface RtkIcon extends Components.RtkIcon, HTMLElement {}
export const RtkIcon: {
    prototype: RtkIcon;
    new (): RtkIcon;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
