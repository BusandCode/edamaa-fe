import type { Components, JSX } from "../types/components";

interface RtkDebugger extends Components.RtkDebugger, HTMLElement {}
export const RtkDebugger: {
    prototype: RtkDebugger;
    new (): RtkDebugger;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
