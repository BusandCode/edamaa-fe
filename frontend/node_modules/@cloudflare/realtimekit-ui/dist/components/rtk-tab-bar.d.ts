import type { Components, JSX } from "../types/components";

interface RtkTabBar extends Components.RtkTabBar, HTMLElement {}
export const RtkTabBar: {
    prototype: RtkTabBar;
    new (): RtkTabBar;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
