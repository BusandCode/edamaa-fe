import type { Components, JSX } from "../types/components";

interface RtkMenuList extends Components.RtkMenuList, HTMLElement {}
export const RtkMenuList: {
    prototype: RtkMenuList;
    new (): RtkMenuList;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
