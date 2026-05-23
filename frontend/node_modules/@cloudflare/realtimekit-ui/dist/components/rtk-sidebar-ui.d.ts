import type { Components, JSX } from "../types/components";

interface RtkSidebarUi extends Components.RtkSidebarUi, HTMLElement {}
export const RtkSidebarUi: {
    prototype: RtkSidebarUi;
    new (): RtkSidebarUi;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
