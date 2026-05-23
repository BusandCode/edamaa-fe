import type { Components, JSX } from "../types/components";

interface RtkSpinner extends Components.RtkSpinner, HTMLElement {}
export const RtkSpinner: {
    prototype: RtkSpinner;
    new (): RtkSpinner;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
