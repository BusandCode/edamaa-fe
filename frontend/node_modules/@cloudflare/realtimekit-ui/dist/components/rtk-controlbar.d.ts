import type { Components, JSX } from "../types/components";

interface RtkControlbar extends Components.RtkControlbar, HTMLElement {}
export const RtkControlbar: {
    prototype: RtkControlbar;
    new (): RtkControlbar;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
