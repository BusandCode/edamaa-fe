import type { Components, JSX } from "../types/components";

interface RtkPolls extends Components.RtkPolls, HTMLElement {}
export const RtkPolls: {
    prototype: RtkPolls;
    new (): RtkPolls;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
