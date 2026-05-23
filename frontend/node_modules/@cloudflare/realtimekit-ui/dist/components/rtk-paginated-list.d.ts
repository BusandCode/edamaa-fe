import type { Components, JSX } from "../types/components";

interface RtkPaginatedList extends Components.RtkPaginatedList, HTMLElement {}
export const RtkPaginatedList: {
    prototype: RtkPaginatedList;
    new (): RtkPaginatedList;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
