import type { Components, JSX } from "../types/components";

interface RtkMenuItem extends Components.RtkMenuItem, HTMLElement {}
export const RtkMenuItem: {
    prototype: RtkMenuItem;
    new (): RtkMenuItem;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
