import type { Components, JSX } from "../types/components";

interface RtkMenu extends Components.RtkMenu, HTMLElement {}
export const RtkMenu: {
    prototype: RtkMenu;
    new (): RtkMenu;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
