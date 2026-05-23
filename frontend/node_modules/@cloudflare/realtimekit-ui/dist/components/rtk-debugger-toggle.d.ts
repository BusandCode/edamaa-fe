import type { Components, JSX } from "../types/components";

interface RtkDebuggerToggle extends Components.RtkDebuggerToggle, HTMLElement {}
export const RtkDebuggerToggle: {
    prototype: RtkDebuggerToggle;
    new (): RtkDebuggerToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
