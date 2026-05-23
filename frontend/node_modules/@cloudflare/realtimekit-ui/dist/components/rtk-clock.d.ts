import type { Components, JSX } from "../types/components";

interface RtkClock extends Components.RtkClock, HTMLElement {}
export const RtkClock: {
    prototype: RtkClock;
    new (): RtkClock;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
