import type { Components, JSX } from "../types/components";

interface RtkNotifications extends Components.RtkNotifications, HTMLElement {}
export const RtkNotifications: {
    prototype: RtkNotifications;
    new (): RtkNotifications;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
