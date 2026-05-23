import type { Components, JSX } from "../types/components";

interface RtkControlbarButton extends Components.RtkControlbarButton, HTMLElement {}
export const RtkControlbarButton: {
    prototype: RtkControlbarButton;
    new (): RtkControlbarButton;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
