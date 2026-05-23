import type { Components, JSX } from "../types/components";

interface RtkHeader extends Components.RtkHeader, HTMLElement {}
export const RtkHeader: {
    prototype: RtkHeader;
    new (): RtkHeader;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
