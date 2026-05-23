import type { Components, JSX } from "../types/components";

interface RtkAi extends Components.RtkAi, HTMLElement {}
export const RtkAi: {
    prototype: RtkAi;
    new (): RtkAi;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
