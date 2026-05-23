import type { Components, JSX } from "../types/components";

interface RtkDebuggerSystem extends Components.RtkDebuggerSystem, HTMLElement {}
export const RtkDebuggerSystem: {
    prototype: RtkDebuggerSystem;
    new (): RtkDebuggerSystem;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
