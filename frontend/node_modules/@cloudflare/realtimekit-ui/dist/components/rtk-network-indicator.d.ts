import type { Components, JSX } from "../types/components";

interface RtkNetworkIndicator extends Components.RtkNetworkIndicator, HTMLElement {}
export const RtkNetworkIndicator: {
    prototype: RtkNetworkIndicator;
    new (): RtkNetworkIndicator;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
