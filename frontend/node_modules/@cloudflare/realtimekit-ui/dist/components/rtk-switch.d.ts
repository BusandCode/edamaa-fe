import type { Components, JSX } from "../types/components";

interface RtkSwitch extends Components.RtkSwitch, HTMLElement {}
export const RtkSwitch: {
    prototype: RtkSwitch;
    new (): RtkSwitch;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
