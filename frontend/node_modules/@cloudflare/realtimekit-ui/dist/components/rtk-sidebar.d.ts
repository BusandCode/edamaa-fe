import type { Components, JSX } from "../types/components";

interface RtkSidebar extends Components.RtkSidebar, HTMLElement {}
export const RtkSidebar: {
    prototype: RtkSidebar;
    new (): RtkSidebar;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
