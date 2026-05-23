import type { Components, JSX } from "../types/components";

interface RtkGridPagination extends Components.RtkGridPagination, HTMLElement {}
export const RtkGridPagination: {
    prototype: RtkGridPagination;
    new (): RtkGridPagination;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
