import type { Components, JSX } from "../types/components";

interface RtkLogo extends Components.RtkLogo, HTMLElement {}
export const RtkLogo: {
    prototype: RtkLogo;
    new (): RtkLogo;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
