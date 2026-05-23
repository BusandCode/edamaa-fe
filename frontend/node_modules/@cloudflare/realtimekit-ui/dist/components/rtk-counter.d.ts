import type { Components, JSX } from "../types/components";

interface RtkCounter extends Components.RtkCounter, HTMLElement {}
export const RtkCounter: {
    prototype: RtkCounter;
    new (): RtkCounter;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
