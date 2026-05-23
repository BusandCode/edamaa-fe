import type { Components, JSX } from "../types/components";

interface RtkButton extends Components.RtkButton, HTMLElement {}
export const RtkButton: {
    prototype: RtkButton;
    new (): RtkButton;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
