import type { Components, JSX } from "../types/components";

interface RtkNotification extends Components.RtkNotification, HTMLElement {}
export const RtkNotification: {
    prototype: RtkNotification;
    new (): RtkNotification;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
